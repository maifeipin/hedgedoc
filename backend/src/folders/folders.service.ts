/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldNameFolder, Folder, TableFolder, TableNote, FieldNameNote } from '@hedgedoc/database';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectConnection } from 'nest-knexjs';

export interface FolderNode extends Folder {
  children: FolderNode[];
  notesCount?: number;
}

@Injectable()
export class FoldersService {
  constructor(
    @InjectConnection()
    private readonly knex: Knex,
  ) {}

  /**
   * 确保用户拥有默认系统 Inbox 及基础根目录文件夹
   */
  async ensureUserInboxFolder(userId: number): Promise<Folder> {
    const existing = await this.knex(TableFolder)
      .where({
        [FieldNameFolder.ownerId]: userId,
        [FieldNameFolder.isSystem]: true,
        [FieldNameFolder.name]: 'Inbox',
      })
      .first();

    if (!existing) {
      const defaultFolders = [
        { name: 'Inbox', isSystem: true, sortOrder: 0 },
        { name: '📁 个人笔记', isSystem: false, sortOrder: 1 },
        { name: '📁 工作项目', isSystem: false, sortOrder: 2 },
        { name: '📁 知识库', isSystem: false, sortOrder: 3 },
        { name: '📁 归档', isSystem: false, sortOrder: 4 },
      ];

      for (const df of defaultFolders) {
        const existFold = await this.knex(TableFolder)
          .where({
            [FieldNameFolder.ownerId]: userId,
            [FieldNameFolder.name]: df.name,
          })
          .first();
        if (!existFold) {
          await this.knex(TableFolder).insert({
            [FieldNameFolder.name]: df.name,
            [FieldNameFolder.ownerId]: userId,
            [FieldNameFolder.isSystem]: df.isSystem,
            [FieldNameFolder.sortOrder]: df.sortOrder,
          });
        }
      }
    }

    return await this.knex(TableFolder)
      .where({
        [FieldNameFolder.ownerId]: userId,
        [FieldNameFolder.isSystem]: true,
        [FieldNameFolder.name]: 'Inbox',
      })
      .first();
  }

  /**
   * 获取用户的所有文件夹并构建树状结构
   */
  async getUserFolderTree(userId: number): Promise<FolderNode[]> {
    await this.ensureUserInboxFolder(userId);

    const folders: Folder[] = await this.knex(TableFolder)
      .where(FieldNameFolder.ownerId, userId)
      .orderBy(FieldNameFolder.sortOrder, 'asc');

    const noteCountsRaw = await (this.knex(TableNote) as any)
      .where(FieldNameNote.ownerId, userId)
      .whereNotNull(FieldNameNote.folderId)
      .select(FieldNameNote.folderId)
      .count(`${FieldNameNote.id} as count`)
      .groupBy(FieldNameNote.folderId);

    const directCountsMap = new Map<number, number>();
    (noteCountsRaw as Array<any>).forEach((row) => {
      directCountsMap.set(Number(row[FieldNameNote.folderId]), parseInt(String(row.count), 10));
    });

    const folderMap = new Map<number, FolderNode>();
    const roots: FolderNode[] = [];

    folders.forEach((f) => {
      const direct = directCountsMap.get(f.id) || 0;
      folderMap.set(f.id, { ...f, notesCount: direct, children: [] });
    });

    folders.forEach((f) => {
      const node = folderMap.get(f.id)!;
      if (f.parentId && folderMap.has(f.parentId)) {
        folderMap.get(f.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const calculateTotalNotesCount = (node: FolderNode): number => {
      let total = node.notesCount || 0;
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          total += calculateTotalNotesCount(child);
        }
      }
      node.notesCount = total;
      return total;
    };

    roots.forEach((root) => calculateTotalNotesCount(root));

    return roots;
  }

  async createFolder(name: string, userId: number, parentId?: number): Promise<Folder> {
    const [inserted] = await this.knex(TableFolder).insert(
      {
        [FieldNameFolder.name]: name,
        [FieldNameFolder.ownerId]: userId,
        [FieldNameFolder.parentId]: parentId || null,
        [FieldNameFolder.isSystem]: false,
      },
      ['*'],
    );
    return inserted;
  }

  async updateFolder(id: number, userId: number, updates: Partial<Folder>): Promise<Folder> {
    await this.knex(TableFolder)
      .where({ id, [FieldNameFolder.ownerId]: userId })
      .update({
        ...updates,
        updatedAt: this.knex.fn.now(),
      });
    return await this.knex(TableFolder).where({ id }).first();
  }

  async deleteFolder(id: number, userId: number): Promise<void> {
    // 校验 1: 是否有下级子文件夹
    const subFolder = await this.knex(TableFolder)
      .where({ [FieldNameFolder.parentId]: id, [FieldNameFolder.ownerId]: userId })
      .first();
    if (subFolder) {
      throw new BadRequestException('该目录包含子文件夹，请先清空子文件夹后再删除');
    }

    // 校验 2: 是否包含 MD 笔记
    const noteInside = await (this.knex(TableNote) as any)
      .where({ [FieldNameNote.folderId]: id, [FieldNameNote.ownerId]: userId })
      .first();
    if (noteInside) {
      throw new BadRequestException('该目录包含 Markdown 笔记，请先移走或删除笔记后再删除');
    }

    await this.knex(TableFolder).where({ id, ownerId: userId }).del();
  }

  async moveNoteToFolder(
    noteIdentifier: string | number,
    folderId: number,
    userId: number,
  ): Promise<void> {
    let targetNoteId =
      typeof noteIdentifier === 'number' ? noteIdentifier : parseInt(noteIdentifier, 10);
    if (isNaN(targetNoteId)) {
      const aliasRow = await (this.knex('alias') as any)
        .where({ alias: String(noteIdentifier) })
        .first();
      if (aliasRow) {
        targetNoteId = aliasRow.note_id;
      }
    }
    if (!targetNoteId) {
      throw new BadRequestException(`无法找到标识符为 '${noteIdentifier}' 的 Markdown 笔记`);
    }

    await (this.knex('note') as any)
      .where({ id: targetNoteId, owner_id: userId })
      .update({ folder_id: folderId });
  }
}
