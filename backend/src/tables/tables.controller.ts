/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Request } from '@nestjs/common'

import { TablesService } from './tables.service'

@Controller('api/v2/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  async createTable(
    @Request() req: any,
    @Body('name') name: string,
    @Body('folderId') folderId?: number,
  ) {
    const userId = req.user?.id || 1
    return await this.tablesService.createTable(name, userId, folderId)
  }

  @Get(':id')
  async getTable(@Param('id', ParseIntPipe) id: number) {
    return await this.tablesService.getTableDetails(id)
  }

  @Post(':id/columns')
  async addColumn(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
    @Body('type') type: string,
    @Body('options') options?: any,
  ) {
    return await this.tablesService.addColumn(id, name, type, options)
  }

  @Post(':id/records')
  async createRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body('data') data: Record<string, any>,
    @Body('noteId') noteId?: number,
  ) {
    return await this.tablesService.createRecord(id, data || {}, noteId)
  }

  @Patch('records/:recordId/cell')
  async updateCell(
    @Param('recordId') recordId: string,
    @Body('columnId') columnId: string,
    @Body('value') value: any,
  ) {
    return await this.tablesService.updateRecordCell(recordId, columnId, value)
  }
}
