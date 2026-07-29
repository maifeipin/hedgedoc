#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
#
# SPDX-License-Identifier: AGPL-3.0-only
"""
HedgeDoc v1.9.9 -> HedgeDoc v2 Full Data Migration Script

Converts historical v1 "Notes" table rows into v2 normalized tables:
- note
- alias
- revision
- authorship_info
- note_group_permission
- folders
- tags & note_tags
- note_links
"""

import sys
import re
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor

DB_CONFIG = {
    "dbname": "hedgedoc",
    "user": "hedgedoc",
    "password": "password",
    "host": "172.20.0.3",
    "port": 5432
}

def extract_tags(content: str):
    if not content:
        return []
    tags = re.findall(r'#([\w\u4e00-\u9fa5_-]+)', content)
    return list(set([t.strip().lower() for t in tags if t.strip()]))

def extract_wiki_links(content: str):
    if not content:
        return []
    matches = re.findall(r'\[\[(.*?)\]\]', content)
    return list(set([m.strip() for m in matches if m.strip()]))

def migrate():
    print("Starting full HedgeDoc v1.9.9 -> v2 data migration...")
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        cur = conn.cursor()

        # 1. Get default user ID (bot2@bot.com)
        cur.execute('SELECT id FROM "user" WHERE email = %s OR username = %s LIMIT 1;', ('bot2@bot.com', 'bot2@bot.com'))
        user_row = cur.fetchone()
        if not user_row:
            cur.execute('SELECT id FROM "user" LIMIT 1;')
            user_row = cur.fetchone()
        default_user_id = user_row['id'] if user_row else 1

        # 2. Ensure Inbox folder exists
        cur.execute(
            'SELECT id FROM folders WHERE "ownerId" = %s AND "isSystem" = TRUE AND name = \'Inbox\';',
            (default_user_id,)
        )
        inbox = cur.fetchone()
        if not inbox:
            cur.execute(
                'INSERT INTO folders (name, "ownerId", "isSystem", "sortOrder") VALUES (\'Inbox\', %s, TRUE, 0) RETURNING id;',
                (default_user_id,)
            )
            inbox_id = cur.fetchone()['id']
        else:
            inbox_id = inbox['id']

        # 3. Fetch v1 Notes
        cur.execute('SELECT * FROM "Notes" WHERE content IS NOT NULL;')
        old_notes = cur.fetchall()
        print(f"Found {len(old_notes)} historical v1 notes to migrate.")

        migrated_count = 0
        skipped_count = 0

        for note in old_notes:
            v1_uuid = str(note['id'])
            content = note.get('content') or ''
            title = note.get('title') or f"Note-{v1_uuid[:8]}"
            created_at = note.get('createdAt') or note.get('updatedAt')

            # Check if this alias already exists in v2 alias table
            cur.execute('SELECT note_id FROM alias WHERE alias = %s;', (v1_uuid,))
            existing_alias = cur.fetchone()
            if existing_alias:
                skipped_count += 1
                new_note_id = existing_alias['note_id']
                cur.execute('UPDATE note SET "folder_id" = %s WHERE id = %s;', (inbox_id, new_note_id))
                continue

            # a) Insert into note table
            cur.execute(
                'INSERT INTO note (version, "created_at", "owner_id", "publicly_visible", "folder_id") VALUES (2, %s, %s, TRUE, %s) RETURNING id;',
                (created_at, default_user_id, inbox_id)
            )
            new_note_id = cur.fetchone()['id']

            # b) Insert into alias table
            cur.execute(
                'INSERT INTO alias (alias, note_id, is_primary) VALUES (%s, %s, TRUE) ON CONFLICT DO NOTHING;',
                (v1_uuid, new_note_id)
            )

            # c) Insert into revision table
            rev_uuid = str(uuid.uuid4())
            cur.execute(
                'INSERT INTO revision (uuid, note_id, patch, content, title, description, note_type, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);',
                (rev_uuid, new_note_id, '', content, title, '', 'document', created_at)
            )

            # d) Insert into authorship_info table
            cur.execute(
                'INSERT INTO authorship_info (revision_id, author_id, start_position, end_position, created_at) VALUES (%s, %s, 0, %s, %s);',
                (rev_uuid, default_user_id, len(content), created_at)
            )

            # e) Insert note_group_permission (_EVERYONE=1, _LOGGED_IN=2)
            cur.execute(
                'INSERT INTO note_group_permission (note_id, group_id, can_edit) VALUES (%s, 1, TRUE), (%s, 2, TRUE) ON CONFLICT DO NOTHING;',
                (new_note_id, new_note_id)
            )

            # f) Extract and insert Tags
            tags = extract_tags(content)
            for tag_name in tags:
                cur.execute('SELECT id FROM tags WHERE name = %s;', (tag_name,))
                tag_row = cur.fetchone()
                if not tag_row:
                    cur.execute('INSERT INTO tags (name) VALUES (%s) RETURNING id;', (tag_name,))
                    tag_id = cur.fetchone()['id']
                else:
                    tag_id = tag_row['id']
                
                cur.execute(
                    'INSERT INTO note_tags ("noteId", "tagId") VALUES (%s, %s) ON CONFLICT DO NOTHING;',
                    (new_note_id, tag_id)
                )

            # g) Extract and insert note_links
            wiki_links = extract_wiki_links(content)
            for link_target in wiki_links:
                cur.execute(
                    'INSERT INTO note_links ("sourceNoteId", "rawTargetTitle", "contextSnippet") VALUES (%s, %s, %s);',
                    (new_note_id, link_target, f"From Note: {title}")
                )

            migrated_count += 1

        conn.commit()
        print(f"SUCCESS: Migrated {migrated_count} notes, Skipped (already existed): {skipped_count}.")

    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == '__main__':
    migrate()
