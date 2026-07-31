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
            <div className='flex-shrink-0 me-3'>
              <button
                type='button'
                onClick={() => setIsCollapsed(false)}
                className='w-9 h-9 rounded-xl bg-slate-900/90 text-slate-200 border border-slate-800 shadow-sm hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center cursor-pointer'
                title='展开侧边工作台 (目录与标签)'>
                <svg width={16} height={16} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-blue-400'>
                  <rect width='18' height='18' x='3' y='3' rx='2' ry='2' />
                  <path d='M9 3v18' />
                  <path d='m14 9 3 3-3 3' />
                </svg>
              </button>
            </div>
          )}

          {/* Left Sidebar Panel */}
          {!isCollapsed && (
            <div
              className='d-flex flex-column flex-shrink-0 bg-slate-900/60 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-2.5 me-3 border border-slate-800/80 shadow-md position-relative'
              style={{
                width: `${sidebarWidth}px`,
                height: 'calc(100vh - 180px)',
                transition: isDragging ? 'none' : 'width 0.15s ease'
              }}>
              <div className='d-flex justify-content-between align-items-center mb-2.5 pb-2 border-bottom border-slate-800/80 px-2'>
                <span className='fw-semibold text-slate-200 text-xs m-0 d-flex align-items-center gap-1.5 tracking-wide'>
                  <span>📖 侧边工作台</span>
                </span>
                <button
                  type='button'
                  onClick={() => setIsCollapsed(true)}
                  className='btn btn-sm btn-link p-0 text-slate-400 text-decoration-none text-xs hover:text-slate-200 transition-colors'
                  title='折叠侧边栏'>
                  ◀ 折叠
                </button>
              </div>

              {/* FolderTree Upper Scroll Container */}
              <div className='flex-grow-1 overflow-y-auto mb-2 pe-1 space-y-1' style={{ minHeight: '120px' }}>
                <FolderTree onNoteMoved={() => window.dispatchEvent(new CustomEvent('hedgedoc:note-moved'))} />
              </div>

              {/* TagCloud Lower Container (Anchored at bottom) */}
              <div className='pt-2 border-top border-slate-800/80 flex-shrink-0 mt-auto'>
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
