/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface Folder {
  [FieldNameFolder.id]: number
  [FieldNameFolder.name]: string
  [FieldNameFolder.parentId]?: number
  [FieldNameFolder.ownerId]: number
  [FieldNameFolder.isSystem]: boolean
  [FieldNameFolder.sortOrder]: number
  [FieldNameFolder.createdAt]: string
  [FieldNameFolder.updatedAt]: string
}

export enum FieldNameFolder {
  id = 'id',
  name = 'name',
  parentId = 'parentId',
  ownerId = 'ownerId',
  isSystem = 'isSystem',
  sortOrder = 'sortOrder',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

export const TableFolder = 'folders'
