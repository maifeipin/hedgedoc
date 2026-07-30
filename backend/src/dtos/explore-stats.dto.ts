/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { ApiProperty } from '@nestjs/swagger';

export class ExploreStatsDto {
  @ApiProperty({ description: '当前用户 Markdown 笔记总数' })
  totalNotes!: number;

  @ApiProperty({ description: '分类目录总数' })
  totalFolders!: number;

  @ApiProperty({ description: '标签总数' })
  totalTags!: number;
}
