/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use client'
import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export interface FolderNode {
  id: number
  name: string
  isSystem?: boolean
  parentId?: number
  notesCount?: number
  children?: FolderNode[]
}

interface FolderTreeProps {
  onSelectFolder?: (folderId: number | null) => void
  onImportMD?: () => void
  onNoteMoved?: () => void
}

export const FolderTree: React.FC<FolderTreeProps> = ({ onSelectFolder, onImportMD, onNoteMoved }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const selectedFolderIdParam = searchParams?.get('folderId')
  const selectedFolderId = selectedFolderIdParam ? parseInt(selectedFolderIdParam, 10) : null

  const [treeData, setTreeData] = useState<FolderNode[]>([])
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState<boolean>(true)

  // Modal / Form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [newFolderName, setNewFolderName] = useState<string>('')
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null)
  const [draggedOverId, setDraggedOverId] = useState<number | null>(null)

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
        const buildExpand = (nodes: FolderNode[]) => {
          nodes.forEach((n) => {
            initialExpand[n.id] = true
            if (n.children) buildExpand(n.children)
          })
        }
        buildExpand(data)
        setExpanded(initialExpand)
      }
    } catch (e) {
      console.error('Failed to load folder tree', e)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSelect = (folderId: number) => {
    const newId = selectedFolderId === folderId ? null : folderId

    const params = new URLSearchParams(searchParams?.toString() || '')
    if (newId) {
      params.set('folderId', newId.toString())
    } else {
      params.delete('folderId')
    }
    router.push(`${pathname}?${params.toString()}`)

    if (onSelectFolder) {
      onSelectFolder(newId)
    }
  }

  const openAddForm = (parentId: number | null = null) => {
    setSelectedParentId(parentId)
    setNewFolderName('')
    setShowAddForm(true)
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    try {
      const res = await fetch('/api/v2/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: selectedParentId || undefined
        })
      })
      if (res.ok) {
        setNewFolderName('')
        setShowAddForm(false)
        await fetchTree()
      } else {
        const err = await res.json()
        alert(err.message || '创建文件夹失败')
      }
    } catch (err) {
      console.error('Failed to create folder', err)
    }
  }

  const handleDeleteFolder = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除该文件夹吗？')) return
    try {
      const res = await fetch(`/api/v2/folders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedFolderId === id) {
          const params = new URLSearchParams(searchParams?.toString() || '')
          params.delete('folderId')
          router.push(`${pathname}?${params.toString()}`)
        }
        await fetchTree()
      } else {
        const errorData = await res.json()
        alert(errorData.message || '删除失败，请确保目录下无子文件夹或笔记')
      }
    } catch (err) {
      console.error('Failed to delete folder', err)
      alert('删除失败，请检查网络')
    }
  }

  const handleDragOver = (e: React.DragEvent, folderId: number) => {
    e.preventDefault()
    setDraggedOverId(folderId)
  }

  const handleDragLeave = () => {
    setDraggedOverId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: number) => {
    e.preventDefault()
    setDraggedOverId(null)
    const noteIdStr = e.dataTransfer.getData('text/plain')
    if (!noteIdStr) return

    try {
      const res = await fetch('/api/v2/folders/move-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: noteIdStr, folderId: targetFolderId })
      })
      if (res.ok) {
        await fetchTree()
        if (onNoteMoved) onNoteMoved()
      }
    } catch (err) {
      console.error('Failed to move note to folder', err)
    }
  }

  const getAllFolderOptions = (nodes: FolderNode[], prefix: string = ''): { id: number; name: string }[] => {
    let options: { id: number; name: string }[] = []
    nodes.forEach((n) => {
      options.push({ id: n.id, name: `${prefix}${n.name}` })
      if (n.children && n.children.length > 0) {
        options = options.concat(getAllFolderOptions(n.children, `${prefix}└─ `))
      }
    })
    return options
  }

  const renderNode = (node: FolderNode, level: number = 0) => {
    const isExpanded = !!expanded[node.id]
    const isSelected = selectedFolderId === node.id
    const hasChildren = node.children && node.children.length > 0
    const isOver = draggedOverId === node.id

    // Dynamic folder icon without surrogate pair regex
    let cleanName = node.name.trim()
    if (cleanName.startsWith('📁')) cleanName = cleanName.replace('📁', '').trim()
    if (cleanName.startsWith('📥')) cleanName = cleanName.replace('📥', '').trim()
    if (cleanName.startsWith('📂')) cleanName = cleanName.replace('📂', '').trim()

    const iconPrefix = node.isSystem ? '📥' : isExpanded ? '📂' : '📁'

    return (
      <div key={node.id} className='select-none text-xs group'>
        <div
          role='treeitem'
          aria-selected={isSelected}
          tabIndex={0}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          onClick={() => handleSelect(node.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleSelect(node.id)
            }
          }}
          className={`w-full flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer transition-all ${
            isSelected
              ? 'bg-primary text-white font-medium shadow-sm'
              : isOver
                ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-primary shadow-sm'
                : 'hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200'
          } ${level > 0 ? 'ms-3' : ''}`}>
          <div className='flex items-center gap-1.5 min-w-0 flex-1 me-1'>
            <button
              type='button'
              onClick={(e) => toggleExpand(node.id, e)}
              className={`p-0 border-0 bg-transparent text-xs ${isSelected ? 'text-white' : 'text-slate-400'} ${
                !hasChildren ? 'invisible' : ''
              }`}>
              {isExpanded ? '▼' : '▶'}
            </button>
            <span className='me-1'>{iconPrefix}</span>
            <span className='truncate font-normal'>{cleanName}</span>
            {node.notesCount !== undefined && node.notesCount > 0 && (
              <span
                className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full ms-1 transition-all ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400'
                }`}>
                {node.notesCount}
              </span>
            )}
          </div>

          {/* Hover Action Bar */}
          <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity me-0.5'>
            {!node.isSystem && (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  openAddForm(node.id)
                }}
                className={`px-1 py-0.5 border-0 rounded text-[11px] ${
                  isSelected ? 'text-white hover:bg-white/20' : 'text-primary hover:bg-primary/10'
                }`}
                title='在该目录下新建子目录'>
                +子项
              </button>
            )}
            {!node.isSystem && (
              <button
                type='button'
                onClick={(e) => handleDeleteFolder(node.id, e)}
                className={`px-1 py-0.5 border-0 rounded text-[11px] transition-colors ${
                  isSelected
                    ? 'text-white/80 hover:text-white hover:bg-red-500/40'
                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                }`}
                title='删除目录'>
                ✕
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className='ps-2 border-start border-slate-200 dark:border-neutral-700 ms-3 my-0.5 space-y-0.5'>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='w-full flex flex-col bg-slate-50/80 dark:bg-neutral-900/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-neutral-800'>
      {/* Header controls */}
      <div className='flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-neutral-800'>
        <h2 className='font-bold text-slate-700 dark:text-neutral-200 text-xs tracking-wide m-0 d-flex align-items-center gap-1'>
          <span>📖 目录与工作台</span>
        </h2>
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => openAddForm(null)}
            className='btn btn-sm btn-outline-primary py-0 px-1.5 text-xs rounded-md'
            title='新建顶级根目录'>
            + 根目录
          </button>
          {selectedFolderId && (
            <button
              type='button'
              onClick={() => openAddForm(selectedFolderId)}
              className='btn btn-sm btn-primary py-0 px-1.5 text-xs rounded-md'
              title='在选中目录下创建子目录'>
              + 子目录
            </button>
          )}
          {onImportMD && (
            <button
              type='button'
              onClick={onImportMD}
              className='btn btn-sm btn-secondary py-0 px-1.5 text-xs rounded-md'
              title='导入 Markdown 文件'>
              导入
            </button>
          )}
        </div>
      </div>

      {/* Add Folder Form Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleCreateFolder}
          className='mb-3 p-2 bg-white dark:bg-neutral-800 border rounded-lg shadow-sm flex flex-col gap-2'>
          <div className='text-xs font-semibold text-slate-700 dark:text-neutral-300'>新建文件夹</div>
          <div>
            <label htmlFor='parent-folder-select' className='text-xs text-slate-500 mb-1 block'>
              选择上级目录：
            </label>
            <select
              id='parent-folder-select'
              value={selectedParentId || ''}
              onChange={(e) => setSelectedParentId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className='form-select form-select-sm text-xs rounded-md dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700'>
              <option value=''>(无 - 作为顶级根目录)</option>
              {getAllFolderOptions(treeData).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <input
              type='text'
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder='输入文件夹名称...'
              className='form-control form-control-sm text-xs rounded-md dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700'
              required
            />
          </div>
          <div className='flex justify-end gap-1 pt-1'>
            <button
              type='button'
              onClick={() => setShowAddForm(false)}
              className='btn btn-sm btn-light text-xs py-0.5 px-2 rounded-md'>
              取消
            </button>
            <button type='submit' className='btn btn-sm btn-success text-xs py-0.5 px-2 rounded-md'>
              保存
            </button>
          </div>
        </form>
      )}

      {/* Folder Tree List (No inner overflow-y-auto to prevent double scrollbars) */}
      <div className='space-y-0.5'>
        {loading ? (
          <div className='text-xs text-slate-400 p-2'>加载目录中...</div>
        ) : treeData.length === 0 ? (
          <div className='text-xs text-slate-400 p-2'>暂无目录</div>
        ) : (
          treeData.map((node) => renderNode(node))
        )}
      </div>
    </div>
  )
}
