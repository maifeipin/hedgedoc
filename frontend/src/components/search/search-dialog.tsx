/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use me';
import React, { useEffect, useState } from 'react';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (noteId: number) => void;
}

export const SearchDialog: React.FC<SearchDialogProps> = ({ isOpen, onClose, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <span className="text-neutral-400">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索全文或输入 Cmd + K..."
            className="w-full bg-transparent outline-none text-sm text-neutral-800 dark:text-neutral-100 placeholder-neutral-400"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 text-neutral-400 hover:text-neutral-600 rounded"
          >
            ESC
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {query ? (
            <div className="text-xs text-neutral-400 p-4 text-center">输入中... 关联 Meilisearch 秒级高亮搜索</div>
          ) : (
            <div className="text-xs text-neutral-400 p-4 text-center">按 Esc 或点击任意位置关闭</div>
          )}
        </div>
      </div>
    </div>
  );
};
