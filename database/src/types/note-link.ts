/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface NoteLink {
  [FieldNameNoteLink.id]: number
  [FieldNameNoteLink.sourceNoteId]: number
  [FieldNameNoteLink.targetNoteId]?: number
  [FieldNameNoteLink.rawTargetTitle]: string
  [FieldNameNoteLink.contextSnippet]?: string
  [FieldNameNoteLink.createdAt]: string
  [FieldNameNoteLink.updatedAt]: string
}

export enum FieldNameNoteLink {
  id = 'id',
  sourceNoteId = 'sourceNoteId',
  targetNoteId = 'targetNoteId',
  rawTargetTitle = 'rawTargetTitle',
  contextSnippet = 'contextSnippet',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

export const TableNoteLink = 'note_links'
