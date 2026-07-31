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
  Put,
} from '@nestjs/common';

import { FoldersService } from './folders.service';
import { RequestUserId } from '../api/utils/decorators/request-user-id.decorator';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get('tree')
  async getTree(@RequestUserId() userId: number) {
    return await this.foldersService.getUserFolderTree(userId);
  }

  @Post()
  async createFolder(
    @RequestUserId() userId: number,
    @Body('name') name: string,
    @Body('parentId') parentId?: number,
  ) {
    return await this.foldersService.createFolder(name, userId, parentId);
  }

  @Post('move-note')
  async moveNote(
    @RequestUserId() userId: number,
    @Body('noteId') noteId: string | number,
    @Body('folderId', ParseIntPipe) folderId: number,
  ) {
    await this.foldersService.moveNoteToFolder(noteId, folderId, userId);
    return { success: true };
  }

  @Put(':id')
  async updateFolder(
    @RequestUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updates: any,
  ) {
    return await this.foldersService.updateFolder(id, userId, updates);
  }

  @Delete(':id')
  async deleteFolder(@RequestUserId() userId: number, @Param('id', ParseIntPipe) id: number) {
    await this.foldersService.deleteFolder(id, userId);
    return { success: true };
  }
}
