'use client'

/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { PropsWithChildren } from 'react'
import React, { Fragment, useEffect, useState, useRef, useCallback } from 'react'
import { Container } from 'react-bootstrap'
import { Welcome } from '../../../components/explore-page/welcome'
import { PinnedNotes } from '../../../components/explore-page/pinned-notes/pinned-notes'
import { loadPinnedNotes } from '../../../redux/pinned-notes/methods'
import { useUiNotifications } from '../../../components/notifications/ui-notification-boundary'
import { FolderTree } from '../../../components/tree/folder-tree'
import { TagCloud } from '../../../components/tags/tag-cloud'

export type ExploreLayoutProps = PropsWithChildren

/**
 * Layout for the explore page with a resizable & collapsible FolderTree & TagCloud sidebar.
 */
export default function ExploreLayout({ children }: ExploreLayoutProps) {
  const { showErrorNotificationBuilder } = useUiNotifications()
  const [sidebarWidth, setSidebarWidth] = useState<number>(300)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const layoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadPinnedNotes().catch(showErrorNotificationBuilder('explore.pinnedNotes.loadingError'))
  }, [showErrorNotificationBuilder])

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsDragging(false)
  }, [])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isDragging && layoutRef.current) {
        const bounds = layoutRef.current.getBoundingClientRect()
        const newWidth = e.clientX - bounds.left
        if (newWidth >= 180 && newWidth <= 550) {
          setSidebarWidth(newWidth)
        }
      }
    },
    [isDragging]
  )

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
    } else {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isDragging, resize, stopResizing])

  return (
    <Fragment>
      <Container fluid className='px-4 py-3'>
        <Welcome />
        <div ref={layoutRef} className='d-flex mt-3 position-relative' style={{ minHeight: 'calc(100vh - 180px)' }}>
          {/* Collapsed Toggle Button when Collapsed */}
          {isCollapsed && (
            <button
              type='button'
              onClick={() => setIsCollapsed(false)}
              className='btn btn-sm btn-outline-secondary position-absolute top-0 start-0 z-3 m-2'
              title='展开工作台侧边栏'>
              📖 展开侧边栏 ▶
            </button>
          )}

          {/* Left Sidebar Panel */}
          {!isCollapsed && (
            <div
              className='d-flex flex-column border-end pe-2 flex-shrink-0 bg-slate-50/50 dark:bg-neutral-900/50 rounded-2xl p-2 me-2 position-relative shadow-2xs'
              style={{
                width: `${sidebarWidth}px`,
                height: 'calc(100vh - 180px)',
                transition: isDragging ? 'none' : 'width 0.15s ease'
              }}>
              <div className='d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-slate-200/80 dark:border-neutral-800 px-1'>
                <span className='fw-bold text-slate-700 dark:text-neutral-200 text-xs m-0 d-flex align-items-center gap-1'>
                  <span>📖 侧边工作台</span>
                </span>
                <button
                  type='button'
                  onClick={() => setIsCollapsed(true)}
                  className='btn btn-sm btn-link p-0 text-secondary text-decoration-none text-xs hover:text-primary'
                  title='折叠侧边栏'>
                  ◀ 折叠
                </button>
              </div>

              {/* FolderTree Upper Scroll Container */}
              <div className='flex-grow-1 overflow-y-auto mb-2 pe-1 space-y-1' style={{ minHeight: '120px' }}>
                <FolderTree onNoteMoved={() => window.dispatchEvent(new CustomEvent('hedgedoc:note-moved'))} />
              </div>

              {/* TagCloud Lower Container (Anchored at bottom) */}
              <div className='pt-2 border-top border-slate-200/80 dark:border-neutral-800 flex-shrink-0 mt-auto'>
                <TagCloud />
              </div>
            </div>
          )}

          {/* Resizer Splitter Drag Handle */}
          {!isCollapsed && (
            <div
              role='separator'
              tabIndex={0}
              onMouseDown={startResizing}
              className='bg-secondary-subtle hover-bg-primary cursor-col-resize user-select-none'
              style={{
                width: '6px',
                cursor: 'col-resize',
                borderRadius: '3px',
                transition: 'background-color 0.2s',
                backgroundColor: isDragging ? '#0d6efd' : '#e9ecef',
                marginRight: '12px'
              }}
              title='拖动调整侧边栏宽度'
            />
          )}

          {/* Right Main Content Panel */}
          <div className='flex-grow-1 overflow-hidden'>
            <PinnedNotes />
            <div className='mt-3'>{children}</div>
          </div>
        </div>
      </Container>
    </Fragment>
  )
}
