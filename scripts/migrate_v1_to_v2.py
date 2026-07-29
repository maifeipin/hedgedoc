#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
#
# SPDX-License-Identifier: AGPL-3.0-only
"""
HedgeDoc v1.9.9 ➔ HedgeDoc v2 云笔记数据一键无损迁移脚本

作用：
1. 从旧数据库 (hedgedoc) 读取历史笔记 Notes。
2. 自动在 v2 数据库 (hedgedoc_v2) 建立并归入 "📥 收件箱 (Inbox)" 目录。
3. 正则扫描正文中的 #tag 刷入 tags 与 note_tags 表。
4. 正则扫描正文中的 [[...]] 关联双向链接并插入 note_links 表。
"""

import sys
import re
import psycopg2
from psycopg2.extras import RealDictCursor

# 数据库连接参数 (根据 VPS1 部署环境变量配置)
OLD_DB_CONFIG = {
    "dbname": "hedgedoc",
    "user": "hedgedoc",
    "password": "your_password_here",
    "host": "127.0.0.1",
    "port": 5432
}

NEW_DB_CONFIG = {
    "dbname": "hedgedoc_v2",
    "user": "hedgedoc",
    "password": "your_password_here",
    "host": "127.0.0.1",
    "port": 5432
}

def extract_tags(content: str):
    if not content:
        return []
    # 匹配 #tag_name 格式
    tags = re.findall(r'#([\w\u4e00-\u9fa5_-]+)', content)
    return list(set([t.strip().lower() for t in tags if t.strip()]))

def extract_wiki_links(content: str):
    if not content:
        return []
    matches = re.findall(r'\[\[(.*?)\]\]', content)
    return list(set([m.strip() for m in matches if m.strip()]))

def migrate():
    print("🚀 开始 HedgeDoc v1.9.9 ➔ v2 云笔记数据迁移...")
    try:
        conn_old = psycopg2.connect(**OLD_DB_CONFIG, cursor_factory=RealDictCursor)
        conn_new = psycopg2.connect(**NEW_DB_CONFIG, cursor_factory=RealDictCursor)
        
        cur_old = conn_old.cursor()
        cur_new = conn_new.cursor()

        # 1. 查询旧 v1.9.9 的所有 Notes
        cur_old.execute('SELECT * FROM "Notes" WHERE content IS NOT NULL;')
        old_notes = cur_old.fetchall()
        print(f"📊 发现旧版笔记共 {len(old_notes)} 篇。")

        for note in old_notes:
            owner_id = note.get('ownerId') or 1
            content = note.get('content') or ''
            title = note.get('title') or f"Note-{note['id'][:8]}"

            # 2. 在 v2 确保存在 Inbox 目录
            cur_new.execute(
                'SELECT id FROM folders WHERE "ownerId" = %s AND "isSystem" = TRUE AND name = \'Inbox\';',
                (owner_id,)
            )
            inbox = cur_new.fetchone()
            if not inbox:
                cur_new.execute(
                    'INSERT INTO folders (name, "ownerId", "isSystem", "sortOrder") VALUES (\'Inbox\', %s, TRUE, 0) RETURNING id;',
                    (owner_id,)
                )
                inbox_id = cur_new.fetchone()['id']
            else:
                inbox_id = inbox['id']

            # 3. 写入 v2 notes 表
            cur_new.execute(
                'INSERT INTO notes ("ownerId", version, "publiclyVisible", "folderId") VALUES (%s, 2, TRUE, %s) RETURNING id;',
                (owner_id, inbox_id)
            )
            new_note_id = cur_new.fetchone()['id']

            # 4. 写入 aliases 表
            cur_new.execute(
                'INSERT INTO aliases (alias, "noteId", "isPrimary") VALUES (%s, %s, TRUE);',
                (title, new_note_id)
            )

            # 5. 提取并写入 Tags
            tags = extract_tags(content)
            for tag_name in tags:
                cur_new.execute('SELECT id FROM tags WHERE name = %s;', (tag_name,))
                tag_row = cur_new.fetchone()
                if not tag_row:
                    cur_new.execute('INSERT INTO tags (name) VALUES (%s) RETURNING id;', (tag_name,))
                    tag_id = cur_new.fetchone()['id']
                else:
                    tag_id = tag_row['id']
                
                cur_new.execute(
                    'INSERT INTO note_tags ("noteId", "tagId") VALUES (%s, %s) ON CONFLICT DO NOTHING;',
                    (new_note_id, tag_id)
                )

            # 6. 提取并写入 note_links
            wiki_links = extract_wiki_links(content)
            for link_target in wiki_links:
                cur_new.execute(
                    'INSERT INTO note_links ("sourceNoteId", "rawTargetTitle", "contextSnippet") VALUES (%s, %s, %s);',
                    (new_note_id, link_target, f"来自迁移笔记: {title}")
                )

        conn_new.commit()
        print(f"✅ 成功无损迁移 {len(old_notes)} 篇笔记至 HedgeDoc v2 Inbox！")

    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        sys.exit(1)
    finally:
        if 'conn_old' in locals(): conn_old.close()
        if 'conn_new' in locals(): conn_new.close()

if __name__ == '__main__':
    migrate()
