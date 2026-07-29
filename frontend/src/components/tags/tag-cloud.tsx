/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use me';
import React, { useEffect, useState } from 'react';

export interface TagItem {
  id: number;
  name: string;
  color?: string;
  count: number;
}

interface TagCloudProps {
  onSelectTag?: (tagName: string) => void;
}

export const TagCloud: React.FC<TagCloudProps> = ({ onSelectTag }) => {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    void fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/v2/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (e) {
      console.error('Failed to load tags', e);
    }
  };

  const handleTagClick = (name: string) => {
    const next = selectedTag === name ? null : name;
    setSelectedTag(next);
    if (onSelectTag) {
      onSelectTag(next || '');
    }
  };

  return (
    <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
        🏷️ 标签分类
      </h3>
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
        {tags.length === 0 ? (
          <span className="text-xs text-neutral-400">暂无标签</span>
        ) : (
          tags.map((tag) => {
            const isSelected = selectedTag === tag.name;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagClick(tag.name)}
                className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                #{tag.name} <span className="opacity-60 text-[10px]">({tag.count})</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
