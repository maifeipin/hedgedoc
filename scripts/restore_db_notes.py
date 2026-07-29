import psycopg2
import uuid

DB_CONFIG = {
    "dbname": "hedgedoc",
    "user": "hedgedoc",
    "password": "password",
    "host": "172.20.0.3",
    "port": 5432
}

def restore_notes():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("TRUNCATE TABLE note, revision, alias, authorship_info, note_group_permission RESTART IDENTITY CASCADE;")

    cur.execute('SELECT id FROM folders WHERE "isSystem" = TRUE ORDER BY id ASC LIMIT 1;')
    inbox_row = cur.fetchone()
    inbox_id = inbox_row[0] if inbox_row else 10

    cur.execute('SELECT id, title, content, "createdAt", "updatedAt" FROM "Notes" ORDER BY "createdAt" ASC;')
    notes = cur.fetchall()

    for n in notes:
        v1_id, title, content, created_at, updated_at = n
        cur.execute(
            'INSERT INTO note (version, created_at, owner_id, publicly_visible, folder_id) VALUES (1, %s, 1, true, %s) RETURNING id;',
            (created_at, inbox_id)
        )
        v2_note_id = cur.fetchone()[0]
        rev_uuid = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO revision (uuid, note_id, patch, content, title, description, yjs_state_vector, note_type, created_at) VALUES (%s, %s, '', %s, %s, '', NULL, 'document', %s);",
            (rev_uuid, v2_note_id, content or '', title or 'Untitled Note', created_at)
        )
        cur.execute(
            "INSERT INTO alias (alias, note_id, is_primary) VALUES (%s, %s, true);",
            (v1_id, v2_note_id)
        )
        cur.execute(
            "INSERT INTO note_group_permission (note_id, group_id, can_edit) VALUES (%s, 1, false), (%s, 2, true);",
            (v2_note_id, v2_note_id)
        )

    conn.commit()
    print("Successfully restored", len(notes), "notes!")
    conn.close()

if __name__ == '__main__':
    restore_notes()
