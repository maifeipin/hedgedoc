/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';

import { TagsService } from './tags.service';

@Controller('api/v2/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async getAllTags() {
    return await this.tagsService.getAllTagsWithCount();
  }

  @Post('note/:noteId')
  async setNoteTags(@Param('noteId', ParseIntPipe) noteId: number, @Body('tags') tags: string[]) {
    await this.tagsService.setNoteTags(noteId, tags || []);
    return { success: true };
  }
}
