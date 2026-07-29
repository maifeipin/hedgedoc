/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Injectable } from '@nestjs/common';
import { InjectConnection } from 'nest-knexjs';
import { Knex } from 'knex';
import { TableNoteLink, FieldNameNoteLink, TableAlias } from '@hedgedoc/database';
import { OnEvent } from '@nestjs/event-emitter';
import { NoteEvent } from '../events';

export interface BacklinkResult {
  id: number;
  sourceNoteId: number;
  sourceTitle: string;
  contextSnippet?: string;
  createdAt: string;
}

@Injectable()
export class LinksService {
  constructor(
    @InjectConnection()
    private readonly knex: Knex,
  ) {}

  /**
   * 从 Markdown 中正则提取所有 [[笔记标题]]
   */
  extractWikiLinks(content: string): { title: string; snippet: string }[] {
    const regex = /\[\[(.*?)\]\]/g;
    const matches: { title: string; snippet: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const title = match[1].trim();
      if (!title) continue;

      // 提取前后约 80 字字符作为上下文摘要
      const start = Math.max(0, match.index - 40);
      const end = Math.min(content.length, match.index + match[0].length + 40);
      const snippet = content.slice(start, end).replace(/\n/g, ' ');

      matches.push({ title, snippet });
    }

    return matches;
  }

  /**
   * 更新笔记的反向链接记录 (包含 Diff 与僵尸行擦除删除)
   */
  async syncNoteLinks(sourceNoteId: number, markdownContent: string): Promise<void> {
    const extracted = this.extractWikiLinks(markdownContent);

    await this.knex.transaction(async (trx) => {
      // 1. 删除旧的该 noteId 发出的链接
      await trx(TableNoteLink).where(FieldNameNoteLink.sourceNoteId, sourceNoteId).del();

      if (extracted.length === 0) return;

      // 2. 查询已有 noteId/alias 匹配 targetNoteId
      for (const item of extracted) {
        // 查别名或标题匹配
        const targetAlias = await trx(TableAlias)
          .select('noteId')
          .where('alias', item.title)
          .first();

        let targetNoteId: number | null = targetAlias ? targetAlias.noteId : null;

        await trx(TableNoteLink).insert({
          [FieldNameNoteLink.sourceNoteId]: sourceNoteId,
          [FieldNameNoteLink.targetNoteId]: targetNoteId,
          [FieldNameNoteLink.rawTargetTitle]: item.title,
          [FieldNameNoteLink.contextSnippet]: item.snippet,
        });
      }
    });
  }

  /**
   * 对账机制：当新笔记创建或别名更新时，主动补全/挂接原本为 NULL 的 targetNoteId
   */
  @OnEvent(NoteEvent.CREATED)
  @OnEvent(NoteEvent.ALIAS_UPDATE)
  async reconcileLinks(noteId: number, titleOrAlias?: string): Promise<void> {
    const titlesToMatch: string[] = [];

    if (titleOrAlias) {
      titlesToMatch.push(titleOrAlias);
    }

    // 从 DB 深度补全该 Note 的所有已知别名与 ID 字符串，防范事件参数缺失
    const aliases = await this.knex(TableAlias).select('alias').where({ noteId });
    aliases.forEach((a) => {
      if (a.alias && !titlesToMatch.includes(a.alias)) {
        titlesToMatch.push(a.alias);
      }
    });

    // 亦支持用 "Note #id" 或 "id" 形式作为引用匹配
    titlesToMatch.push(String(noteId));

    if (titlesToMatch.length === 0) return;

    await this.knex(TableNoteLink)
      .whereNull(FieldNameNoteLink.targetNoteId)
      .whereIn(FieldNameNoteLink.rawTargetTitle, titlesToMatch)
      .update({
        [FieldNameNoteLink.targetNoteId]: noteId,
        updatedAt: this.knex.fn.now(),
      });
  }

  /**
   * 获取某个笔记被引用的反链列表
   */
  async getBacklinks(noteId: number): Promise<BacklinkResult[]> {
    const rows = await this.knex(TableNoteLink)
      .select(
        `${TableNoteLink}.id`,
        `${TableNoteLink}.sourceNoteId`,
        `${TableNoteLink}.contextSnippet`,
        `${TableNoteLink}.createdAt`,
        `${TableAlias}.alias as sourceTitle`,
      )
      .leftJoin(TableAlias, `${TableAlias}.noteId`, `${TableNoteLink}.sourceNoteId`)
      .where(`${TableNoteLink}.targetNoteId`, noteId);

    return rows.map((r) => ({
      id: r.id,
      sourceNoteId: r.sourceNoteId,
      sourceTitle: r.sourceTitle || `Note #${r.sourceNoteId}`,
      contextSnippet: r.contextSnippet,
      createdAt: r.createdAt,
    }));
  }
}
