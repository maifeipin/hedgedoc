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
  onSelectFolder?: (folderId: number | null) => void
  onImportMD?: () => void
}

export const FolderTree: React.FC<FolderTreeProps> = ({ onSelectFolder, onImportMD }) => {
  const [treeData, setTreeData] = useState<FolderNode[]>([])
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
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
    setSelectedFolderId(newId)
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
        if (selectedFolderId === id) setSelectedFolderId(null)
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
    const noteId = parseInt(noteIdStr, 10)
    if (!noteId) return

    try {
      const res = await fetch('/api/v2/folders/move-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, folderId: targetFolderId })
      })
      if (res.ok) {
        alert('笔记成功移动至新目录！')
        await fetchTree()
      }
    } catch (err) {
      console.error('Failed to move note to folder', err)
    }
  }

  // Flatten options for parent selection dropdown
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

    // Dynamic folder icon according to state
    let folderIcon = node.isSystem ? '📥' : isExpanded ? '📂' : '📁'
    if (!node.isSystem && node.name.startsWith('📁')) {
      const cleanName = node.name.replace(/^📁\s*/, '')
      folderIcon = isExpanded ? `📂 ${cleanName}` : `📁 ${cleanName}`
    } else {
      folderIcon = `${folderIcon} ${node.name.replace(/^[📥📁📂]\s*/, '')}`
    }

    return (
      <div key={node.id} className='select-none text-xs'>
        <div
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          onClick={() => handleSelect(node.id)}
          className={`w-full flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-all ${
            isSelected
              ? 'bg-primary text-white font-medium shadow-sm'
              : isOver
                ? 'bg-primary-subtle ring-2 ring-primary'
                : 'hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
          } ${level > 0 ? 'ms-3' : ''}`}>
          <div className='flex items-center gap-1.5 min-w-0 flex-1'>
            <button
              type='button'
              onClick={(e) => toggleExpand(node.id, e)}
              className={`p-0 border-0 bg-transparent text-xs ${isSelected ? 'text-white' : 'text-neutral-400'} ${
                !hasChildren ? 'invisible' : ''
              }`}>
              {isExpanded ? '▼' : '▶'}
            </button>
            <span className='truncate'>{folderIcon}</span>
          </div>

          <div className='flex items-center gap-1 opacity-80 hover:opacity-100 ms-1'>
            {!node.isSystem && (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation()
                  openAddForm(node.id)
                }}
                className={`p-0 border-0 bg-transparent text-xs ${isSelected ? 'text-white' : 'text-primary'}`}
                title='在该目录下新建子目录'>
                +子项
              </button>
            )}
            {!node.isSystem && (
              <button
                type='button'
                onClick={(e) => handleDeleteFolder(node.id, e)}
                className={`p-0 border-0 bg-transparent text-xs ms-1 ${
                  isSelected ? 'text-white' : 'text-neutral-400 hover:text-red-500'
                }`}
                title='删除目录'>
                ✕
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className='ps-2 border-start border-neutral-200 dark:border-neutral-700 ms-3 my-0.5'>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='w-full flex flex-col bg-neutral-50 dark:bg-neutral-900 p-2.5 rounded'>
      {/* Header controls */}
      <div className='flex items-center justify-between pb-2 mb-2 border-bottom border-neutral-200 dark:border-neutral-800'>
        <h2 className='font-bold text-neutral-700 dark:text-neutral-200 text-xs tracking-wide m-0'>📖 目录与工作台</h2>
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => openAddForm(null)}
            className='btn btn-sm btn-outline-primary py-0 px-1.5 text-xs'
            title='新建顶级根目录'>
            + 根目录
          </button>
          {selectedFolderId && (
            <button
              type='button'
              onClick={() => openAddForm(selectedFolderId)}
              className='btn btn-sm btn-primary py-0 px-1.5 text-xs'
              title='在选中目录下创建子目录'>
              + 子目录
            </button>
          )}
          {onImportMD && (
            <button
              type='button'
              onClick={onImportMD}
              className='btn btn-sm btn-secondary py-0 px-1.5 text-xs'
              title='导入 Markdown 文件'>
              导入
            </button>
          )}
        </div>
      </div>

      {/* Add Folder Modal / Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleCreateFolder}
          className='mb-3 p-2 bg-white dark:bg-neutral-800 border rounded shadow-sm flex flex-col gap-2'>
          <div className='text-xs font-semibold text-neutral-600 dark:text-neutral-300'>新建文件夹</div>
          <div>
            <label className='text-xs text-neutral-500 mb-1 block'>选择上级目录：</label>
            <select
              value={selectedParentId || ''}
              onChange={(e) => setSelectedParentId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className='form-select form-select-sm text-xs'>
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
              className='form-control form-control-sm text-xs'
              required
            />
          </div>
          <div className='flex justify-end gap-1 pt-1'>
            <button
              type='button'
              onClick={() => setShowAddForm(false)}
              className='btn btn-sm btn-light text-xs py-0 px-2'>
              取消
            </button>
            <button type='submit' className='btn btn-sm btn-success text-xs py-0 px-2'>
              确定保存
            </button>
          </div>
        </form>
      )}

      {/* Folder Tree List */}
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
