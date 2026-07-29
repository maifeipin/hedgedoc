/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { FieldNameFolder, Folder, TableFolder } from '@hedgedoc/database'
import { Injectable } from '@nestjs/common'
import { Knex } from 'knex'
import { InjectConnection } from 'nest-knexjs'

export interface FolderNode extends Folder {
  children: FolderNode[]
  notesCount?: number
}

@Injectable()
export class FoldersService {
  constructor(
    @InjectConnection()
    private readonly knex: Knex,
  ) {}

  /**
   * 确保用户拥有默认系统 Inbox 文件夹
   */
  async ensureUserInboxFolder(userId: number): Promise<Folder> {
    const existing = await this.knex(TableFolder)
      .where({
        [FieldNameFolder.ownerId]: userId,
        [FieldNameFolder.isSystem]: true,
        [FieldNameFolder.name]: 'Inbox',
      })
      .first()

    if (existing) {
      return existing
    }

    const [createdId] = await this.knex(TableFolder).insert(
      {
        [FieldNameFolder.name]: 'Inbox',
        [FieldNameFolder.ownerId]: userId,
        [FieldNameFolder.isSystem]: true,
        [FieldNameFolder.sortOrder]: 0,
      },
      [FieldNameFolder.id],
    )

    const folderId = typeof createdId === 'object' ? createdId.id : createdId
    return await this.knex(TableFolder).where({ id: folderId }).first()
  }

  /**
   * 获取用户的所有文件夹并构建树状结构
   */
  async getUserFolderTree(userId: number): Promise<FolderNode[]> {
    await this.ensureUserInboxFolder(userId)

    const folders: Folder[] = await this.knex(TableFolder)
      .where(FieldNameFolder.ownerId, userId)
      .orderBy(FieldNameFolder.sortOrder, 'asc')

    const folderMap = new Map<number, FolderNode>()
    const roots: FolderNode[] = []

    folders.forEach((f) => {
      folderMap.set(f.id, { ...f, children: [] })
    })

    folders.forEach((f) => {
      const node = folderMap.get(f.id)!
      if (f.parentId && folderMap.has(f.parentId)) {
        folderMap.get(f.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
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
    )
    return inserted
  }

  async updateFolder(id: number, userId: number, updates: Partial<Folder>): Promise<Folder> {
    await this.knex(TableFolder)
      .where({ id, ownerId: userId })
      .update({
        ...updates,
        updatedAt: this.knex.fn.now(),
      })
    return await this.knex(TableFolder).where({ id }).first()
  }

  async deleteFolder(id: number, userId: number): Promise<void> {
    await this.knex(TableFolder).where({ id, ownerId: userId }).del()
  }
}
