'use client'
/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { Fragment, useEffect, useRef, useState } from 'react'
import { Mode } from '../mode-selection/mode'
import type { NoteType } from '@hedgedoc/commons'
import { FilterByNoteType } from './filters/filter-by-note-type'
import { FilterBySearchTerm } from './filters/filter-by-search-term'
import { useUrlParamState } from '../../../hooks/common/use-url-param-state'
import { SortButton } from './filters/sort-button'
import { NotesList } from './notes-list/notes-list'
import { SortMode } from '@hedgedoc/commons'
import { ModeSelection } from '../mode-selection/mode-selection'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import styles from './explore-notes-section.module.css'

export interface ExploreNotesSectionProps {
  mode: Mode
}

interface FolderPathItem {
  id: number
  name: string
}

/**
 * Renders the section that shows the notes of the explore page.
 *
 * @param mode The current mode of the explore page, for example to show public notes or own notes.
 */
export const ExploreNotesSection: React.FC<ExploreNotesSectionProps> = ({ mode }) => {
  const [searchFilter, setSearchFilter] = useUrlParamState<string | null>('search', null)
  const [sortMode, setSortMode] = useUrlParamState<SortMode>(
    'sort',
    mode === Mode.VISITED ? SortMode.LAST_VISITED_DESC : SortMode.UPDATED_AT_DESC
  )
  const [filterByType, setFilterByType] = useUrlParamState<NoteType | null>('type', null)
  const [folderIdString, setFolderIdString] = useUrlParamState<string | null>('folderId', null)
  const [tagFilter, setTagFilter] = useUrlParamState<string | null>('tag', null)
  const previousMode = useRef<Mode>(mode)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [folderPath, setFolderPath] = useState<FolderPathItem[]>([])

  // 获取当前选中文件夹的路径面包屑
  useEffect(() => {
    if (!folderIdString) {
      setFolderPath([])
      return
    }
    let cancelled = false
    fetch('/api/v2/folders/tree')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return
        const targetId = parseInt(folderIdString, 10)
        const path: FolderPathItem[] = []
        const find = (nodes: any[]): boolean => {
          for (const node of nodes) {
            if (node.id === targetId) {
              path.push({ id: node.id, name: node.name })
              return true
            }
            if (node.children && find(node.children)) {
              path.unshift({ id: node.id, name: node.name })
              return true
            }
          }
          return false
        }
        find(data)
        setFolderPath(path)
      })
      .catch(() => setFolderPath([]))
    return () => {
      cancelled = true
    }
  }, [folderIdString])

  // Reset filters when mode/page changes
  useEffect(() => {
    if (previousMode.current !== mode) {
      setSearchFilter(null)
      setSortMode(mode === Mode.VISITED ? SortMode.LAST_VISITED_DESC : SortMode.UPDATED_AT_DESC)
      setFilterByType(null)
      setFolderIdString(null)
      setTagFilter(null)
      previousMode.current = mode
    }
  }, [mode, setFilterByType, setSearchFilter, setSortMode, setFolderIdString, setTagFilter])

  const navigateToFolder = (folderId: number | null) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (folderId !== null) {
      params.set('folderId', folderId.toString())
    } else {
      params.delete('folderId')
    }
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname || '')
  }

  return (
    <Fragment>
      <div className={styles['filter-and-nav-box']}>
        <ModeSelection />
        <search className={'d-flex gap-2 mb-2'}>
          <FilterByNoteType value={filterByType} onChange={setFilterByType} />
          <FilterBySearchTerm value={searchFilter} onChange={setSearchFilter} />
          <SortButton selected={sortMode} onChange={setSortMode} showLastVisitedOptions={mode === Mode.VISITED} />
        </search>
      </div>
      {folderPath.length > 0 && (
        <div className={styles['breadcrumb-bar']}>
          <button
            type='button'
            className={styles['breadcrumb-link']}
            onClick={() => navigateToFolder(null)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigateToFolder(null) }}
            role='link'
            tabIndex={0}>
            全部笔记
          </button>
          {folderPath.map((item, index) => (
            <Fragment key={item.id}>
              <span className={styles['breadcrumb-separator']}>/</span>
              {index === folderPath.length - 1 ? (
                <span className={styles['breadcrumb-current']}>{item.name}</span>
              ) : (
                <button
                  type='button'
                  className={styles['breadcrumb-link']}
                  onClick={() => navigateToFolder(item.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateToFolder(item.id) }}
                  role='link'
                  tabIndex={0}>
                  {item.name}
                </button>
              )}
            </Fragment>
          ))}
          <button
            type='button'
            className={styles['breadcrumb-clear']}
            onClick={() => navigateToFolder(null)}
            title='清除目录筛选'>
            ✕
          </button>
        </div>
      )}
      <NotesList
        mode={mode}
        sort={sortMode}
        searchFilter={searchFilter}
        typeFilter={filterByType}
        folderId={folderIdString ? parseInt(folderIdString, 10) : undefined}
        tagFilter={tagFilter || undefined}
      />
    </Fragment>
  )
}
