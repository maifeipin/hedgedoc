/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import { FieldNameFolder, FieldNameNote, TableFolder } from '@hedgedoc/database';
import { BadRequestException, Provider } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Tracker } from 'knex-mock-client';

import { mockDelete, mockQuery, mockSelect, mockUpdate } from '../database/mock/mock-queries';
import { mockKnexDb } from '../database/mock/provider';
import { FoldersService } from './folders.service';

describe('FoldersService', () => {
  let service: FoldersService;
  let tracker: Tracker;
  let knexProvider: Provider;

  beforeAll(async () => {
    [tracker, knexProvider] = mockKnexDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoldersService, knexProvider],
    }).compile();
    service = module.get<FoldersService>(FoldersService);
  });

  afterEach(() => {
    tracker.reset();
    jest.restoreAllMocks();
  });

  describe('deleteFolder', () => {
    const userId = 1;
    const folderId = 10;

    it('throws when the folder contains sub-folders', async () => {
      mockSelect(
        tracker,
        [],
        TableFolder,
        [FieldNameFolder.parentId, FieldNameFolder.ownerId],
        [{ id: 99 }],
      );
      await expect(service.deleteFolder(folderId, userId)).rejects.toThrow(BadRequestException);
    });

    it('throws when the folder contains notes', async () => {
      mockSelect(tracker, [], TableFolder, [FieldNameFolder.parentId, FieldNameFolder.ownerId], []);
      mockSelect(tracker, [], 'note', ['folder_id', 'owner_id'], [{ id: 1 }]);
      await expect(service.deleteFolder(folderId, userId)).rejects.toThrow(BadRequestException);
    });

    it('deletes the folder when it is empty', async () => {
      mockSelect(tracker, [], TableFolder, [FieldNameFolder.parentId, FieldNameFolder.ownerId], []);
      mockSelect(tracker, [], 'note', ['folder_id', 'owner_id'], []);
      mockDelete(tracker, TableFolder, [FieldNameFolder.id, FieldNameFolder.ownerId], 1);
      await expect(service.deleteFolder(folderId, userId)).resolves.toBeUndefined();
    });
  });

  describe('moveNoteToFolder', () => {
    it('updates the folder_id of the given note', async () => {
      mockUpdate(tracker, 'note', [FieldNameNote.folderId], 'id', 1);
      await expect(service.moveNoteToFolder(5, 10, 1)).resolves.toBeUndefined();
    });
  });

  describe('getUserFolderTree', () => {
    it('returns hierarchical folders with notesCount', async () => {
      jest.spyOn(service, 'ensureUserInboxFolder').mockResolvedValue({ id: 1 } as any);

      // 1. mock folders query for getUserFolderTree
      mockSelect(
        tracker,
        [],
        TableFolder,
        [FieldNameFolder.ownerId],
        [
          { id: 1, name: 'Inbox', parentId: null, isSystem: true, sortOrder: 0 },
          { id: 2, name: 'Root Folder', parentId: null, isSystem: false, sortOrder: 1 },
          { id: 3, name: 'Sub Folder', parentId: 2, isSystem: false, sortOrder: 0 },
        ],
      );
      // 2. mock notes count query
      mockQuery('select', tracker, /from "note"/, [
        { folder_id: 1, count: '3' },
        { folder_id: 3, count: '2' },
      ]);

      const tree = await service.getUserFolderTree(1);
      expect(tree).toHaveLength(2);
      const rootFolder = tree.find((n) => n.id === 2);
      expect(rootFolder).toBeDefined();
      expect(rootFolder?.notesCount).toBe(2);
      expect(rootFolder?.children).toHaveLength(1);
      expect(rootFolder?.children[0].notesCount).toBe(2);
    });
  });
});
