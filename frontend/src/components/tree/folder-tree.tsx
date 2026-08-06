/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use client'
import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import styles from './folder-tree.module.scss'

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

  const STORAGE_KEY = 'hedgedoc:folder-tree-expanded'

  // 递归查找节点路径（返回从根到目标的所有父节点 ID）
  const findPath = (nodes: FolderNode[], targetId: number, path: number[] = []): number[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) return [...path, node.id]
      if (node.children) {
        const result = findPath(node.children, targetId, [...path, node.id])
        if (result) return result
      }
    }
    return null
  }

  // Modal / Form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [newFolderName, setNewFolderName] = useState<string>('')
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null)
  const [draggedOverId, setDraggedOverId] = useState<number | null>(null)

  useEffect(() => {
    void fetchTree()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sortTree = (nodes: FolderNode[]): FolderNode[] => {
    return nodes
      .map((n) => ({ ...n, children: n.children ? sortTree(n.children) : undefined }))
      .sort((a, b) => {
        // System folders (Inbox) always first
        if (a.isSystem && !b.isSystem) return -1
        if (!a.isSystem && b.isSystem) return 1
        // Sort: numbers (01, 02...) -> letters (a-z) -> Chinese
        return a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' })
      })
  }

  const fetchTree = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/v2/folders/tree')
      if (res.ok) {
        const data = await res.json()
        const sorted = sortTree(data)
        setTreeData(sorted)

        // 从 localStorage 读取上次保存的展开状态
        let savedExpand: Record<number, boolean> = {}
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) savedExpand = JSON.parse(saved)
        } catch {}

        if (Object.keys(savedExpand).length > 0) {
          // 用保存的展开状态
          setExpanded(savedExpand)
        } else {
          // 首次使用：默认全部折叠
          setExpanded({})
        }

        // 如果有 selectedFolderId，自动展开其父节点路径
        if (selectedFolderId) {
          const path = findPath(data, selectedFolderId)
          if (path) {
            setExpanded((prev) => {
              const updated = { ...prev }
              path.forEach((id) => {
                updated[id] = true
              })
              return updated
            })
          }
        }
      }
    } catch (e) {
      console.error('Failed to load folder tree', e)
    } finally {
      setLoading(false)
    }
  }

  const handleClearSelection = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('folderId')
    const queryString = params.toString()
    const safePath = pathname || ''
    router.push(queryString ? `${safePath}?${queryString}` : safePath)
    if (onSelectFolder) {
      onSelectFolder(null)
    }
  }

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded((prev) => {
      const updated = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  const handleSelect = (folderId: number) => {
    const newId = selectedFolderId === folderId ? null : folderId

    const params = new URLSearchParams(searchParams?.toString() || '')
    if (newId !== null) {
      params.set('folderId', newId.toString())
    } else {
      params.delete('folderId')
    }
    const queryString = params.toString()
    const safePath = pathname || ''
    const targetUrl = queryString ? `${safePath}?${queryString}` : safePath
    router.push(targetUrl)

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

    let cleanName = node.name.trim()
    if (cleanName.startsWith('📁')) cleanName = cleanName.replace('📁', '').trim()
    if (cleanName.startsWith('📥')) cleanName = cleanName.replace('📥', '').trim()
    if (cleanName.startsWith('📂')) cleanName = cleanName.replace('📂', '').trim()

    return (
      <div key={node.id}>
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
          className={`${styles.treeNodeRow} ${isSelected ? styles.selected : ''} ${isOver ? styles.dragOver : ''}`}>
          <div className={styles.nodeLeft}>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id, e)
              }}
              className={`${styles.toggleBtn} ${!hasChildren ? styles.hidden : ''}`}>
              {isExpanded ? (
                <svg
                  width={12}
                  height={12}
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'>
                  <path d='m6 9 6 6 6-6' />
                </svg>
              ) : (
                <svg
                  width={12}
                  height={12}
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'>
                  <path d='m9 18 6-6-6-6' />
                </svg>
              )}
            </button>

            {node.isSystem ? (
              <svg
                width={14}
                height={14}
                className={`${styles.nodeIcon} ${styles.system}`}
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'>
                <polyline points='22 12 16 12 14 15 10 15 8 12 2 12' />
                <path d='M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' />
              </svg>
            ) : isExpanded ? (
              <svg
                width={14}
                height={14}
                className={`${styles.nodeIcon} ${styles.folder}`}
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'>
                <path d='m6 14 1.5-6h13L19 14H6z' />
                <path d='M6 14v4a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3' />
                <path d='M3 6a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v2' />
              </svg>
            ) : (
              <svg
                width={14}
                height={14}
                className={`${styles.nodeIcon} ${styles.folder}`}
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'>
                <path d='M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L8.6 3.3A2 2 0 0 0 6.9 2.5H4a2 2 0 0 0-2 2v13.5a2 2 0 0 0 2 2z' />
              </svg>
            )}

            <span className={styles.nodeText}>{cleanName}</span>

            {node.notesCount !== undefined && node.notesCount > 0 && (
              <span className={styles.nodeBadge}>{node.notesCount}</span>
            )}

            {/* Hover Action Bar */}
            {!node.isSystem && (
              <div className={styles.hoverActions}>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    openAddForm(node.id)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={styles.actionBtn}
                  title='在该目录下新建子目录'>
                  +子项
                </button>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    void handleDeleteFolder(node.id, e)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={styles.deleteBtn}
                  title='删除目录'>
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className={styles.treeChildren}>{node.children!.map((child) => renderNode(child, level + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.treeContainer}>
      {/* Header controls */}
      <div className={styles.treeHeader}>
        <button type='button' onClick={handleClearSelection} className={styles.title} title='查看全部笔记'>
          📂 全部笔记
        </button>
        <div className={styles.headerActions}>
          <button type='button' onClick={() => openAddForm(null)} className={styles.btnPrimary} title='新建顶级根目录'>
            <span>+ 根目录</span>
          </button>
          {selectedFolderId && (
            <button
              type='button'
              onClick={() => openAddForm(selectedFolderId)}
              className={styles.btnSecondary}
              title='在选中目录下创建子目录'>
              <span>+ 子项</span>
            </button>
          )}
          {onImportMD && (
            <button type='button' onClick={onImportMD} className={styles.btnPrimary} title='导入 Markdown 文件'>
              导入
            </button>
          )}
        </div>
      </div>

      {/* Add Folder Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateFolder} className={styles.formDrawer}>
          <div className={styles.formTitle}>新建文件夹</div>
          <div>
            <label htmlFor='parent-folder-select' className={styles.formLabel}>
              选择上级目录：
            </label>
            <select
              id='parent-folder-select'
              value={selectedParentId || ''}
              onChange={(e) => setSelectedParentId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className={styles.formSelect}>
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
              className={styles.formInput}
              required
            />
          </div>
          <div className={styles.formButtons}>
            <button type='button' onClick={() => setShowAddForm(false)} className={styles.btnPrimary}>
              取消
            </button>
            <button type='submit' className={styles.btnSecondary}>
              保存
            </button>
          </div>
        </form>
      )}

      {/* Folder Tree List */}
      <div className={styles.treeList}>
        {loading ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px', textAlign: 'center' }}>加载目录中...</div>
        ) : treeData.length === 0 ? (
          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              padding: '12px',
              textAlign: 'center',
              border: '1px dashed #334155',
              borderRadius: '8px'
            }}>
            暂无目录
          </div>
        ) : (
          treeData.map((node) => renderNode(node))
        )}
      </div>
    </div>
  )
}
