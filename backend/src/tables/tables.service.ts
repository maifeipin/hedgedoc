/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Injectable } from '@nestjs/common';
import { InjectConnection } from 'nest-knexjs';
import { Knex } from 'knex';
import { TableTable, TableTableColumn, TableTableRecord, FieldNameTable } from '@hedgedoc/database';

@Injectable()
export class TablesService {
  constructor(
    @InjectConnection()
    private readonly knex: Knex,
  ) {}

  async createTable(name: string, userId: number, folderId?: number) {
    const [inserted] = await this.knex(TableTable).insert(
      {
        [FieldNameTable.name]: name,
        [FieldNameTable.ownerId]: userId,
        [FieldNameTable.folderId]: folderId || null,
      },
      ['*'],
    );
    return inserted;
  }

  async getTableDetails(tableId: number) {
    const tableInfo = await this.knex(TableTable).where({ id: tableId }).first();
    const columns = await this.knex(TableTableColumn)
      .where({ tableId })
      .orderBy(FieldNameTableColumn.sortOrder, 'asc');
    const records = await this.knex(TableTableRecord)
      .where({ tableId })
      .orderBy('createdAt', 'asc');

    return {
      table: tableInfo,
      columns,
      records,
    };
  }

  async addColumn(tableId: number, name: string, type: string, options?: any) {
    const [col] = await this.knex(TableTableColumn).insert(
      {
        tableId,
        name,
        type,
        options: options ? JSON.stringify(options) : null,
      },
      ['*'],
    );
    return col;
  }

  async createRecord(tableId: number, data: Record<string, any>, noteId?: number) {
    const [rec] = await this.knex(TableTableRecord).insert(
      {
        tableId,
        data: JSON.stringify(data),
        noteId: noteId || null,
      },
      ['*'],
    );
    return rec;
  }

  async updateRecordCell(recordId: string, columnId: string, value: any) {
    // 使用 PostgreSQL jsonb_set 实现原子单元格更新
    await this.knex.raw(
      `UPDATE table_records SET data = jsonb_set(data, ARRAY[?], ?::jsonb), "updatedAt" = NOW() WHERE id = ?`,
      [columnId, JSON.stringify(value), recordId],
    );
    return await this.knex(TableTableRecord).where({ id: recordId }).first();
  }
}
