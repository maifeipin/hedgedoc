/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use client'
import React, { useEffect, useState } from 'react'

export interface TagItem {
  id: number
  name: string
  color?: string
  count: number
}

interface TagCloudProps {
  onSelectTag?: (tagName: string) => void
}

export const TagCloud: React.FC<TagCloudProps> = ({ onSelectTag }) => {
  const [tags, setTags] = useState<TagItem[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState<string>('')
  const [showTagForm, setShowTagForm] = useState<boolean>(false)

  useEffect(() => {
    void fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/v2/tags')
      if (res.ok) {
        const data = await res.json()
        setTags(data)
      }
    } catch (e) {
      console.error('Failed to load tags', e)
    }
  }

  const handleTagClick = (name: string) => {
    const next = selectedTag === name ? null : name
    setSelectedTag(next)
    if (onSelectTag) {
      onSelectTag(next || '')
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return
    try {
      const res = await fetch('/api/v2/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() })
      })
      if (res.ok) {
        setNewTagName('')
        setShowTagForm(false)
        await fetchTags()
      }
    } catch (err) {
      console.error('Failed to create tag', err)
    }
  }

  return (
    <div className='p-3 bg-neutral-50 dark:bg-neutral-900 rounded'>
      <div className='flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 dark:border-neutral-800'>
        <h3 className='font-bold text-neutral-700 dark:text-neutral-200 text-sm tracking-wide m-0'>🏷️ 标签分类</h3>
        <button
          type='button'
          onClick={() => setShowTagForm(!showTagForm)}
          className='btn btn-sm btn-outline-secondary py-0 px-2 text-xs'>
          + 标签
        </button>
      </div>

      {showTagForm && (
        <form onSubmit={handleCreateTag} className='mb-3 flex gap-1'>
          <input
            type='text'
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder='标签名称...'
            className='form-control form-control-sm text-xs'
          />
          <button type='submit' className='btn btn-sm btn-success text-xs px-2'>
            添加
          </button>
        </form>
      )}

      <div className='flex flex-wrap gap-1.5 max-h-48 overflow-y-auto'>
        {tags.length === 0 ? (
          <span className='text-xs text-neutral-400'>暂无标签</span>
        ) : (
          tags.map((tag) => {
            const isSelected = selectedTag === tag.name
            return (
              <button
                key={tag.id}
                type='button'
                onClick={() => handleTagClick(tag.name)}
                style={{ backgroundColor: tag.color || undefined }}
                className={`badge border-0 rounded-pill px-2.5 py-1 text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm ring-2 ring-primary ring-offset-1'
                    : 'bg-secondary-subtle text-secondary-emphasis hover:bg-secondary'
                }`}>
                #{tag.name} {tag.count > 0 && <span className='opacity-75 ms-1'>({tag.count})</span>}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
