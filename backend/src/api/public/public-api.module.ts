/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Module } from '@nestjs/common';

import { AliasModule } from '../../alias/alias.module';
import { ApiTokenModule } from '../../api-token/api-token.module';
import { FoldersModule } from '../../folders/folders.module';
import { FoldersController } from '../../folders/folders.controller';
import { GroupsModule } from '../../groups/groups.module';
import { MediaModule } from '../../media/media.module';
import { MonitoringModule } from '../../monitoring/monitoring.module';
import { NoteModule } from '../../notes/note.module';
import { PermissionsModule } from '../../permissions/permissions.module';
import { RevisionsModule } from '../../revisions/revisions.module';
import { TagsModule } from '../../tags/tags.module';
import { TagsController } from '../../tags/tags.controller';
import { UsersModule } from '../../users/users.module';
import { AliasController } from './alias/alias.controller';
import { MeController } from './me/me.controller';
import { MediaController } from './media/media.controller';
import { MonitoringController } from './monitoring/monitoring.controller';
import { NotesController } from './notes/notes.controller';

@Module({
  imports: [
    ApiTokenModule,
    GroupsModule,
    UsersModule,
    AliasModule,
    RevisionsModule,
    MonitoringModule,
    MediaModule,
    PermissionsModule,
    NoteModule,
    TagsModule,
    FoldersModule,
  ],
  controllers: [
    AliasController,
    MeController,
    NotesController,
    MediaController,
    MonitoringController,
    TagsController,
    FoldersController,
  ],
})
export class PublicApiModule {}
