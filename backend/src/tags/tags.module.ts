/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Module, forwardRef } from '@nestjs/common';

import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { NoteModule } from '../notes/note.module';

@Module({
  imports: [forwardRef(() => NoteModule)],
  providers: [TagsService],
  controllers: [TagsController],
  exports: [TagsService],
})
export class TagsModule {}
