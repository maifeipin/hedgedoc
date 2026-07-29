/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldNameNoteTag, FieldNameTag, TableNoteTag, TableTag } from '@hedgedoc/database'
import { Injectable } from '@nestjs/common'
import { Knex } from 'knex'
import { InjectConnection } from 'nest-knexjs'

export interface TagWithCount {
  id: number
  name: string
  color?: string
  count: number
}

@Injectable()
export class TagsService {
  constructor(
    @InjectConnection()
    private readonly knex: Knex,
  ) {}

  /**
   * 获取所有标签及包含的笔记数量
   */
  async getAllTagsWithCount(): Promise<TagWithCount[]> {
    const rows = await this.knex(TableTag)
      .select(
        `${TableTag}.id`,
        `${TableTag}.name`,
        `${TableTag}.color`,
        this.knex.raw('COUNT(note_tags.note_id)::int as count'),
      )
      .leftJoin(TableNoteTag, `${TableTag}.id`, `${TableNoteTag}.tagId`)
      .groupBy(`${TableTag}.id`, `${TableTag}.name`, `${TableTag}.color`)
      .orderBy('count', 'desc')

    return rows
  }

  /**
   * 为笔记增量设置标签 (解析 #tag 或 yaml 标签后刷入)
   */
  async setNoteTags(noteId: number, tagNames: string[]): Promise<void> {
    const cleanNames = Array.from(
      new Set(tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean)),
    )

    await this.knex.transaction(async (trx) => {
      // 1. 清理该笔记的原有标签映射
      await trx(TableNoteTag).where(FieldNameNoteTag.noteId, noteId).del()

      if (cleanNames.length === 0) return

      for (const tagName of cleanNames) {
        let tag = await trx(TableTag).where(FieldNameTag.name, tagName).first()
        if (!tag) {
          const [createdId] = await trx(TableTag).insert({ [FieldNameTag.name]: tagName }, ['id'])
          const tagId = typeof createdId === 'object' ? createdId.id : createdId
          tag = { id: tagId }
        }

        await trx(TableNoteTag).insert({
          [FieldNameNoteTag.noteId]: noteId,
          [FieldNameNoteTag.tagId]: tag.id,
        })
      }
    })
  }
}
