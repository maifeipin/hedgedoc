/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface Tag {
  [FieldNameTag.id]: number
  [FieldNameTag.name]: string
  [FieldNameTag.color]?: string
  [FieldNameTag.createdAt]: string
}

export enum FieldNameTag {
  id = 'id',
  name = 'name',
  color = 'color',
  createdAt = 'createdAt',
}

export const TableTag = 'tags'

export interface NoteTag {
  [FieldNameNoteTag.noteId]: number
  [FieldNameNoteTag.tagId]: number
}

export enum FieldNameNoteTag {
  noteId = 'noteId',
  tagId = 'tagId',
}

export const TableNoteTag = 'note_tags'
