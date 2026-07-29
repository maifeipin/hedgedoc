/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* oxlint-disable */

exports.up = async function (knex) {
  // 1. 文件夹/目录表 (folders) - camelCase
  await knex.schema.createTable('folders', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table
      .integer('parentId')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('folders')
      .onDelete('CASCADE');
    table
      .integer('ownerId')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.boolean('isSystem').notNullable().defaultTo(false);
    table.integer('sortOrder').notNullable().defaultTo(0);
    table.timestamp('createdAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
    table.index(['ownerId'], 'idx_folders_owner_id');
    table.index(['parentId'], 'idx_folders_parent_id');
  });

  // 2. 给 notes 表添加 folderId 外键 (camelCase)
  await knex.schema.alterTable('notes', (table) => {
    table
      .integer('folderId')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('folders')
      .onDelete('SET NULL');
    table.index(['folderId'], 'idx_notes_folder_id');
  });

  // 3. 🏷️ 标签系统表 (tags & note_tags)
  await knex.schema.createTable('tags', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('color').nullable();
    table.timestamp('createdAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
    table.index(['name'], 'idx_tags_name');
  });

  await knex.schema.createTable('note_tags', (table) => {
    table
      .integer('noteId')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('notes')
      .onDelete('CASCADE');
    table
      .integer('tagId')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tags')
      .onDelete('CASCADE');
    table.primary(['noteId', 'tagId']);
    table.index(['noteId'], 'idx_note_tags_note_id');
    table.index(['tagId'], 'idx_note_tags_tag_id');
  });

  // 4. 🔗 双向链接表 (note_links)
  await knex.schema.createTable('note_links', (table) => {
    table.increments('id').primary();
    table
      .integer('sourceNoteId')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('notes')
      .onDelete('CASCADE');
    table
      .integer('targetNoteId')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('notes')
      .onDelete('CASCADE');
    table.string('rawTargetTitle').notNullable();
    table.text('contextSnippet').nullable();
    table.timestamp('createdAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
    table.index(['sourceNoteId'], 'idx_note_links_source_note_id');
    table.index(['targetNoteId'], 'idx_note_links_target_note_id');
    table.index(['rawTargetTitle'], 'idx_note_links_raw_title');
  });

  // 5. 多维表格主表 (tables)
  await knex.schema.createTable('tables', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table
      .integer('folderId')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('folders')
      .onDelete('CASCADE');
    table
      .integer('ownerId')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.timestamp('createdAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
  });

  // 6. 多维表格列定义表 (table_columns)
  await knex.schema.createTable('table_columns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .integer('tableId')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tables')
      .onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('type').notNullable();
    table.jsonb('options').nullable();
    table.integer('sortOrder').defaultTo(0);
  });

  // 7. 多维表格数据行 (table_records)
  await knex.schema.createTable('table_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .integer('tableId')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('tables')
      .onDelete('CASCADE');
    table.jsonb('data').notNullable().defaultTo('{}');
    table
      .integer('noteId')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('notes')
      .onDelete('SET NULL');
    table.timestamp('createdAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: false, precision: 3 }).defaultTo(knex.fn.now());
  });

  // 8. jsonb_path_ops GIN 索引
  await knex.raw('CREATE INDEX idx_table_records_data_path ON table_records USING gin (data jsonb_path_ops);');
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_table_records_data_path;');
  await knex.schema.dropTableIfExists('table_records');
  await knex.schema.dropTableIfExists('table_columns');
  await knex.schema.dropTableIfExists('tables');
  await knex.schema.dropTableIfExists('note_links');
  await knex.schema.dropTableIfExists('note_tags');
  await knex.schema.dropTableIfExists('tags');
  await knex.schema.alterTable('notes', (table) => {
    table.dropColumn('folderId');
  });
  await knex.schema.dropTableIfExists('folders');
};
