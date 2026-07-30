/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { RequestUserId } from '../api/utils/decorators/request-user-id.decorator';
import { RequestNoteId } from '../api/utils/decorators/request-note-id.decorator';
import { GetNoteIdInterceptor } from '../api/utils/interceptors/get-note-id.interceptor';
import { UseInterceptors } from '@nestjs/common';

import { TagsService } from './tags.service';

@UseGuards(SessionGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async getAllTags(@RequestUserId() userId: number) {
    return await this.tagsService.getAllTagsWithCount(userId);
  }

  @Post()
  async createTag(@RequestUserId() userId: number, @Body() body: { name: string; color?: string }) {
    const name = body?.name || '';
    const color = body?.color;
    return await this.tagsService.createTag(name, color, userId);
  }

  @Delete(':id')
  async deleteTag(@RequestUserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    await this.tagsService.deleteTag(id, userId);
    return { success: true };
  }

  @Post('note/:noteAlias')
  @UseInterceptors(GetNoteIdInterceptor)
  async setNoteTags(
    @RequestUserId() userId: number,
    @RequestNoteId() noteId: number,
    @Body('tags') tags: string[],
  ) {
    await this.tagsService.setNoteTags(noteId, tags || [], userId);
    return { success: true };
  }
}
