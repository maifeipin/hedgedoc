'use client'
/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useState, useEffect } from 'react'
import { Modal, Button } from 'react-bootstrap'
import { useUiNotifications } from '../notifications/ui-notification-boundary'
import type { TagItem } from './tag-cloud'

interface SetTagsModalProps {
  show: boolean
  onHide: () => void
  noteAlias: string
  currentTags: string[]
  onSuccess: () => void
}

export const SetTagsModal: React.FC<SetTagsModalProps> = ({ show, onHide, noteAlias, currentTags, onSuccess }) => {
  const [tags, setTags] = useState<TagItem[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(currentTags))
  const [newTagName, setNewTagName] = useState('')
  const [saving, setSaving] = useState(false)
  const { showErrorNotificationBuilder } = useUiNotifications()

  useEffect(() => {
    if (show) {
      setSelectedTags(new Set(currentTags))
      setNewTagName('')
      void fetchTags()
    }
  }, [show, currentTags])

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

  const toggleTag = (name: string) => {
    const next = new Set(selectedTags)
    if (next.has(name)) {
      next.delete(name)
    } else {
      next.add(name)
    }
    setSelectedTags(next)
  }

  const handleAddNewTag = () => {
    const trimmed = newTagName.trim()
    if (!trimmed) return
    const next = new Set(selectedTags)
    next.add(trimmed)
    setSelectedTags(next)
    setNewTagName('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/v2/tags/note/${noteAlias}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: Array.from(selectedTags) })
      })
      if (res.ok) {
        onSuccess()
        onHide()
      } else {
        const err = await res.json()
        showErrorNotificationBuilder('保存标签失败: ' + (err.message || '未知错误'))(new Error('Tagging failed'))
      }
    } catch (err) {
      showErrorNotificationBuilder('保存标签失败')(err as Error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className='fs-5'>🏷️ 设置笔记标签</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className='mb-3'>
          <label htmlFor='new-tag-input' className='form-label text-sm fw-medium text-slate-700 dark:text-neutral-300'>
            添加新标签
          </label>
          <div className='d-flex gap-2'>
            <input
              id='new-tag-input'
              type='text'
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddNewTag()
                }
              }}
              placeholder='输入标签名称，按回车添加'
              className='form-control form-control-sm rounded-md dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200'
            />
            <Button variant='outline-primary' size='sm' onClick={handleAddNewTag}>
              添加
            </Button>
          </div>
        </div>

        <div className='form-label text-sm fw-medium text-slate-700 dark:text-neutral-300 mb-2'>
          请选择以下已有标签：
        </div>
        <div className='d-flex flex-wrap gap-2 border rounded p-2 bg-slate-50 dark:bg-neutral-900/50 dark:border-neutral-700 min-h-[100px] max-h-60 overflow-auto'>
          {/* Include currently selected tags even if they don't exist in tags array yet */}
          {Array.from(new Set([...tags.map((t) => t.name), ...Array.from(selectedTags)])).map((tagName) => {
            const isSelected = selectedTags.has(tagName)
            const tagObj = tags.find((t) => t.name === tagName)
            const isSystem = tagObj?.isSystem
            return (
              <button
                key={tagName}
                type='button'
                onClick={() => toggleTag(tagName)}
                className={`badge border-0 rounded-full px-2.5 py-1.5 text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm ring-2 ring-primary ring-offset-1 font-medium'
                    : isSystem
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 hover:bg-indigo-100'
                      : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700 hover:bg-slate-100'
                }`}>
                #{tagName}
              </button>
            )
          })}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onHide} disabled={saving}>
          取消
        </Button>
        <Button variant='primary' onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
