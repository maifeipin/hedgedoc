/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface Table {
  [FieldNameTable.id]: number
  [FieldNameTable.name]: string
  [FieldNameTable.folderId]?: number
  [FieldNameTable.ownerId]: number
  [FieldNameTable.createdAt]: string
  [FieldNameTable.updatedAt]: string
}

export enum FieldNameTable {
  id = 'id',
  name = 'name',
  folderId = 'folderId',
  ownerId = 'ownerId',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

export const TableTable = 'tables'

export interface TableColumn {
  [FieldNameTableColumn.id]: string
  [FieldNameTableColumn.tableId]: number
  [FieldNameTableColumn.name]: string
  [FieldNameTableColumn.type]: string
  [FieldNameTableColumn.options]?: Record<string, unknown>
  [FieldNameTableColumn.sortOrder]: number
}

export enum FieldNameTableColumn {
  id = 'id',
  tableId = 'tableId',
  name = 'name',
  type = 'type',
  options = 'options',
  sortOrder = 'sortOrder',
}

export const TableTableColumn = 'table_columns'

export interface TableRecord {
  [FieldNameTableRecord.id]: string
  [FieldNameTableRecord.tableId]: number
  [FieldNameTableRecord.data]: Record<string, unknown>
  [FieldNameTableRecord.noteId]?: number
  [FieldNameTableRecord.createdAt]: string
  [FieldNameTableRecord.updatedAt]: string
}

export enum FieldNameTableRecord {
  id = 'id',
  tableId = 'tableId',
  data = 'data',
  noteId = 'noteId',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

export const TableTableRecord = 'table_records'
