/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use client'
import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export interface TagItem {
  id: number
  name: string
  color?: string
  count: number
  isSystem?: boolean
}

interface TagCloudProps {
  onSelectTag?: (tagName: string) => void
}

export const TagCloud: React.FC<TagCloudProps> = ({ onSelectTag }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const selectedTag = searchParams?.get('tag')

  const [tags, setTags] = useState<TagItem[]>([])
  const [newTagName, setNewTagName] = useState<string>('')
  const [showTagForm, setShowTagForm] = useState<boolean>(false)

  const [presetOpen, setPresetOpen] = useState<boolean>(true)
  const [activeOpen, setActiveOpen] = useState<boolean>(true)
  const [unusedOpen, setUnusedOpen] = useState<boolean>(true)

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

    const params = new URLSearchParams(searchParams?.toString() || '')
    if (next) {
      params.set('tag', next)
    } else {
      params.delete('tag')
    }
    router.push(`${pathname}?${params.toString()}`)

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

  const handleDragStart = (e: React.DragEvent, tagName: string) => {
    e.dataTransfer.setData('text/plain', `tag:${tagName}`)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const systemTags = tags.filter((t: TagItem) => t.isSystem)
  const activeTags = tags.filter((t: TagItem) => !t.isSystem && t.count > 0)
  const unusedTags = tags.filter((t: TagItem) => !t.isSystem && t.count === 0)

  const renderTagPill = (tag: TagItem) => {
    const isSelected = selectedTag === tag.name
    return (
      <button
        key={tag.id}
        type='button'
        draggable={true}
        onDragStart={(e) => handleDragStart(e, tag.name)}
        onClick={() => handleTagClick(tag.name)}
        title='可拖拽打标签'
        className={`badge border-0 rounded-full px-2.5 py-1 text-xs cursor-pointer transition-all duration-150 hover:scale-105 cursor-grab active:cursor-grabbing ${
          isSelected
            ? 'bg-primary text-white shadow-sm ring-2 ring-primary ring-offset-1 font-medium'
            : tag.isSystem
              ? 'bg-info-subtle text-info-emphasis border border-info-subtle hover:bg-info'
              : tag.count === 0
                ? 'bg-body-secondary text-body-secondary border border-body-tertiary hover:bg-body-tertiary'
                : 'bg-body-tertiary text-body border border-body-tertiary hover:bg-body-secondary'
        }`}>
        #{tag.name} {tag.count > 0 && <span className='opacity-75 ms-0.5 text-[10px]'>({tag.count})</span>}
      </button>
    )
  }

  return (
    <div className='p-3.5 bg-body-tertiary text-body rounded-xl border flex flex-col gap-2.5'>
      <div className='flex items-center justify-between pb-2 border-bottom px-1 gap-2'>
        <div className='font-semibold text-body-secondary text-xs tracking-wide flex items-center gap-1.5'>
          <span>🏷️ 标签分类</span>
        </div>
        <button
          type='button'
          onClick={() => setShowTagForm(!showTagForm)}
          className='px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 transition-all cursor-pointer'>
          + 标签
        </button>
      </div>

      {showTagForm && (
        <form onSubmit={handleCreateTag} className='flex gap-1 my-1'>
          <input
            type='text'
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder='标签名称...'
            className='form-control form-control-sm text-xs rounded-md dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700'
          />
          <button type='submit' className='btn btn-sm btn-success text-xs px-2 rounded-md'>
            添加
          </button>
        </form>
      )}

      {tags.length === 0 ? (
        <span className='text-xs text-body-secondary p-1'>暂无标签</span>
      ) : (
        <div className='flex flex-col gap-2.5 max-h-56 overflow-y-auto pe-1'>
          {/* Preset / System Tags Group */}
          {systemTags.length > 0 && (
            <div>
              <button
                type='button'
                onClick={() => setPresetOpen(!presetOpen)}
                className='w-full flex items-center justify-between text-[11px] font-semibold text-body-secondary mb-1.5 p-0 bg-transparent border-0 text-start cursor-pointer hover:text-body'>
                <span>📌 常用预设标签 ({systemTags.length})</span>
                <span className='text-[10px]'>{presetOpen ? '▼' : '▶'}</span>
              </button>
              {presetOpen && <div className='flex flex-wrap gap-1.5'>{systemTags.map(renderTagPill)}</div>}
            </div>
          )}

          {/* Active Extracted Tags Group */}
          {activeTags.length > 0 && (
            <div className={systemTags.length > 0 ? 'pt-1 border-top' : ''}>
              <button
                type='button'
                onClick={() => setActiveOpen(!activeOpen)}
                className='w-full flex items-center justify-between text-[11px] font-semibold text-body-secondary mb-1.5 p-0 bg-transparent border-0 text-start cursor-pointer hover:text-body'>
                <span>🏷️ 使用中的标签 ({activeTags.length})</span>
                <span className='text-[10px]'>{activeOpen ? '▼' : '▶'}</span>
              </button>
              {activeOpen && <div className='flex flex-wrap gap-1.5'>{activeTags.map(renderTagPill)}</div>}
            </div>
          )}

          {/* Unused Custom Tags Group */}
          {unusedTags.length > 0 && (
            <div className={systemTags.length > 0 || activeTags.length > 0 ? 'pt-1 border-top' : ''}>
              <button
                type='button'
                onClick={() => setUnusedOpen(!unusedOpen)}
                className='w-full flex items-center justify-between text-[11px] font-semibold text-body-secondary mb-1.5 p-0 bg-transparent border-0 text-start cursor-pointer hover:text-body'>
                <span>📝 手动保存的标签 ({unusedTags.length})</span>
                <span className='text-[10px]'>{unusedOpen ? '▼' : '▶'}</span>
              </button>
              {unusedOpen && <div className='flex flex-wrap gap-1.5'>{unusedTags.map(renderTagPill)}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
