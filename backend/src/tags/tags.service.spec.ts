/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import { FieldNameTag, TableTag } from '@hedgedoc/database';
import { Provider } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Tracker } from 'knex-mock-client';

import { mockDelete, mockInsert, mockSelect } from '../database/mock/mock-queries';
import { mockKnexDb } from '../database/mock/provider';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;
  let tracker: Tracker;
  let knexProvider: Provider;

  beforeAll(async () => {
    [tracker, knexProvider] = mockKnexDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsService, knexProvider],
    }).compile();
    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => {
    tracker.reset();
    jest.restoreAllMocks();
  });

  describe('createTag', () => {
    it('creates a new tag when the name does not exist yet', async () => {
      mockSelect(tracker, [], TableTag, FieldNameTag.name, []);
      const insertedRow = {
        [FieldNameTag.id]: 7,
        [FieldNameTag.name]: 'important',
        [FieldNameTag.color]: '#3b82f6',
        createdAt: '2026-07-29 00:00:00',
      };
      mockInsert(tracker, TableTag, [FieldNameTag.color, 'creatorId', FieldNameTag.name], [insertedRow]);

      const result = await service.createTag('Important', '#3b82f6', 1);
      expect(result.id).toBe(7);
      expect(result.name).toBe('important');
      expect(result.color).toBe('#3b82f6');
      expect(result.count).toBe(0);
    });

    it('returns the existing tag without creating a duplicate', async () => {
      const existing = {
        [FieldNameTag.id]: 3,
        [FieldNameTag.name]: 'work',
        [FieldNameTag.color]: '#3b82f6',
        createdAt: '2026-07-29 00:00:00',
      };
      mockSelect(tracker, [], TableTag, FieldNameTag.name, [existing]);

      const result = await service.createTag('Work', undefined, 1);
      expect(result.id).toBe(3);
      expect(result.name).toBe('work');
      expect(result.count).toBe(0);
    });
  });

  describe('deleteTag', () => {
    it('deletes the tag with the given id', async () => {
      mockDelete(tracker, TableTag, [FieldNameTag.id], 1);
      await expect(service.deleteTag(5)).resolves.toBeUndefined();
    });
  });
});
