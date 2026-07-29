/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use me';
import React, { useEffect, useState } from 'react';

export interface Backlink {
  id: number;
  sourceNoteId: number;
  sourceTitle: string;
  contextSnippet?: string;
  createdAt: string;
}

interface BacklinksPanelProps {
  noteId?: number;
  onNavigateNote?: (noteId: number) => void;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ noteId, onNavigateNote }) => {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (noteId) {
      fetchBacklinks(noteId);
    }
  }, [noteId]);

  const fetchBacklinks = async (id: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v2/notes/${id}/backlinks`);
      if (res.ok) {
        const data = await res.json();
        setBacklinks(data);
      }
    } catch (e) {
      console.error('Failed to fetch backlinks', e);
    } finally {
      setLoading(false);
    }
  };

  if (!noteId) return null;

  return (
    <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-sm">
      <h3 className="font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 mb-3">
        🔗 反向引用 (Backlinks)
        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
          {backlinks.length}
        </span>
      </h3>

      {loading ? (
        <div className="text-xs text-neutral-400">正在查询关联反链...</div>
      ) : backlinks.length === 0 ? (
        <div className="text-xs text-neutral-400 italic">暂无其它笔记引用当前页面</div>
      ) : (
        <div className="space-y-2">
          {backlinks.map((link) => (
            <div
              key={link.id}
              onClick={() => onNavigateNote && onNavigateNote(link.sourceNoteId)}
              className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 cursor-pointer transition-all"
            >
              <div className="font-medium text-blue-600 dark:text-blue-400 mb-1 hover:underline">
                📄 {link.sourceTitle}
              </div>
              {link.contextSnippet && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-800/50 p-1.5 rounded">
                  "...{link.contextSnippet}..."
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
