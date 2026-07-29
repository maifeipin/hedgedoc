/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { LinksService } from './links.service';

@Controller('api/v2/notes')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':id/backlinks')
  async getBacklinks(@Param('id', ParseIntPipe) id: number) {
    return await this.linksService.getBacklinks(id);
  }
}
