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
  Request,
} from '@nestjs/common';

import { FoldersService } from './folders.service';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get('tree')
  async getTree(@Request() req: any) {
    const userId = req.user?.id || 1;
    return await this.foldersService.getUserFolderTree(userId);
  }

  @Post()
  async createFolder(
    @Request() req: any,
    @Body('name') name: string,
    @Body('parentId') parentId?: number,
  ) {
    const userId = req.user?.id || 1;
    return await this.foldersService.createFolder(name, userId, parentId);
  }

  @Post('move-note')
  async moveNote(
    @Request() req: any,
    @Body('noteId', ParseIntPipe) noteId: number,
    @Body('folderId', ParseIntPipe) folderId: number,
  ) {
    const userId = req.user?.id || 1;
    await this.foldersService.moveNoteToFolder(noteId, folderId, userId);
    return { success: true };
  }

  @Put(':id')
  async updateFolder(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updates: any,
  ) {
    const userId = req.user?.id || 1;
    return await this.foldersService.updateFolder(id, userId, updates);
  }

  @Delete(':id')
  async deleteFolder(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.id || 1;
    await this.foldersService.deleteFolder(id, userId);
    return { success: true };
  }
}
