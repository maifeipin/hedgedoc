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

import { mockDelete, mockSelect, mockUpdate } from '../database/mock/mock-queries';
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
});
