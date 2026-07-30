/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* oxlint-disable */
const { TableUser } = require('@hedgedoc/database');

exports.up = async function (knex) {
  await knex.schema.alterTable('tags', (table) => {
    table
      .integer('creatorId')
      .unsigned()
      .nullable()
      .references('id')
      .inTable(TableUser)
      .onDelete('SET NULL');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('tags', (table) => {
    table.dropColumn('creatorId');
  });
};
