/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use client'
import React, { useState, useEffect } from 'react'

export interface FolderNode {
  id: number
  name: string
  isSystem?: boolean
  parentId?: number
  children?: FolderNode[]
}

interface FolderTreeProps {
  _activeNoteId?: number
  _onSelectNote?: (noteId: number) => void
  _onSelectTable?: (tableId: number) => void
  onImportMD?: () => void
}

export const FolderTree: React.FC<FolderTreeProps> = ({ _activeNoteId, _onSelectNote, _onSelectTable, onImportMD }) => {
  const [treeData, setTreeData] = useState<FolderNode[]>([])
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [newFolderName, setNewFolderName] = useState<string>('')
  const [showAddForm, setShowAddForm] = useState<boolean>(false)

  useEffect(() => {
    void fetchTree()
  }, [])

  const fetchTree = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/v2/folders/tree')
      if (res.ok) {
        const data = await res.json()
        setTreeData(data)
        const initialExpand: Record<number, boolean> = {}
        data.forEach((item: FolderNode) => {
          initialExpand[item.id] = true
        })
        setExpanded(initialExpand)
      }
    } catch (e) {
      console.error('Failed to load folder tree', e)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    try {
      const res = await fetch('/api/v2/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() })
      })
      if (res.ok) {
        setNewFolderName('')
        setShowAddForm(false)
        await fetchTree()
      }
    } catch (err) {
      console.error('Failed to create folder', err)
    }
  }

  const handleDeleteFolder = async (id: number) => {
    if (!confirm('确定要删除该文件夹吗？')) return
    try {
      const res = await fetch(`/api/v2/folders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchTree()
      }
    } catch (err) {
      console.error('Failed to delete folder', err)
    }
  }

  const renderNode = (node: FolderNode, level: number = 0) => {
    const isExpanded = !!expanded[node.id]
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className='select-none text-sm'>
        <div
          className={`w-full flex items-center justify-between py-1 px-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 ${level > 0 ? 'ml-3' : ''}`}>
          <button
            type='button'
            onClick={() => toggleExpand(node.id)}
            className='flex-1 text-left flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0 text-inherit'>
            <span className='w-4 text-center text-xs text-neutral-400'>
              {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
            </span>
            <span className='text-base'>{node.isSystem ? '📥' : '📁'}</span>
            <span className='font-medium truncate'>{node.name}</span>
          </button>

          {!node.isSystem && (
            <button
              type='button'
              onClick={() => handleDeleteFolder(node.id)}
              className='text-xs text-neutral-400 hover:text-red-500 opacity-60 hover:opacity-100 p-0.5 bg-transparent border-0'
              title='删除目录'>
              ✕
            </button>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className='pl-2 border-l border-neutral-200 dark:border-neutral-700 ml-3'>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='w-full h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 p-3 rounded'>
      <div className='flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 dark:border-neutral-800'>
        <h2 className='font-bold text-neutral-700 dark:text-neutral-200 text-sm tracking-wide m-0'>📖 目录与工作台</h2>
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => setShowAddForm(!showAddForm)}
            className='btn btn-sm btn-outline-primary py-0 px-2 text-xs'
            title='新建文件夹'>
            + 新建
          </button>
          {onImportMD && (
            <button
              type='button'
              onClick={onImportMD}
              className='btn btn-sm btn-primary py-0 px-2 text-xs'
              title='导入 Markdown 文件'>
              导入
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateFolder} className='mb-3 flex gap-1'>
          <input
            type='text'
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder='文件夹名称...'
            className='form-control form-control-sm text-xs'
          />
          <button type='submit' className='btn btn-sm btn-success text-xs px-2'>
            保存
          </button>
        </form>
      )}

      <div className='flex-1 overflow-y-auto space-y-1'>
        {loading ? (
          <div className='text-xs text-neutral-400 p-2'>加载目录中...</div>
        ) : treeData.length === 0 ? (
          <div className='text-xs text-neutral-400 p-2'>暂无目录</div>
        ) : (
          treeData.map((node) => renderNode(node))
        )}
      </div>
    </div>
  )
}
