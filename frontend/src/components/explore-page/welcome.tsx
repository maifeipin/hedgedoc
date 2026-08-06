/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useEffect, useState, useCallback } from 'react'
import { useApplicationState } from '../../hooks/common/use-application-state'
import { createNote } from '../../api/notes'
import { getExploreStats, type ExploreStatsInterface } from '../../api/explore'
import { useRouter } from 'next/navigation'
import { useUiNotifications } from '../notifications/ui-notification-boundary'
import { Trans, useTranslation } from 'react-i18next'

/**
 * Renders a glassmorphic dashboard header for the explore page.
 */
export const Welcome: React.FC = () => {
  useTranslation()
  const userName = useApplicationState((state) => state.user?.displayName || state.user?.username || '用户')
  const [stats, setStats] = useState<ExploreStatsInterface>({ totalNotes: 0, totalFolders: 0, totalTags: 0 })
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()
  const { showErrorNotificationBuilder } = useUiNotifications()

  useEffect(() => {
    let isMounted = true
    getExploreStats()
      .then((data) => {
        if (isMounted) {
          setStats(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const handleCreateNewNote = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    const folderId = params.get('folderId')
    createNote('')
      .then(async (note) => {
        if (folderId) {
          try {
            await fetch('/api/v2/folders/move-note', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                noteId: note.metadata.primaryAlias,
                folderId: parseInt(folderId, 10)
              })
            })
          } catch {
            // 移动失败不阻塞，笔记已创建
          }
        }
        router?.push(`/n/${note.metadata.primaryAlias}`)
      })
      .catch((err: Error) => {
        showErrorNotificationBuilder(err.message)
      })
  }, [router, showErrorNotificationBuilder])

  return (
    <div className='bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 border border-slate-200/80 dark:border-neutral-700/60 rounded-xl p-4 mb-4 shadow-sm backdrop-blur-sm transition-all'>
      <div className='d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3'>
        {/* Welcome Text */}
        <div>
          <h2 className='h4 font-bold text-slate-800 dark:text-neutral-100 m-0 d-flex align-items-center gap-2'>
            <span>
              👋 <Trans i18nKey={'explore.welcome.user'} values={{ userName }} defaults='欢迎回来，{{userName}}' />
            </span>
          </h2>
          <p className='text-muted small m-0 mt-1'>整理知识、高效写作，体验极致的 Markdown 实时协同与目录分类管理。</p>
        </div>

        {/* Stats Micro-Cards & Quick Actions */}
        <div className='d-flex flex-wrap align-items-center gap-2 ms-md-auto'>
          {/* Stat 1: Notes Count */}
          <div className='d-flex align-items-center gap-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border border-blue-200/50 dark:border-neutral-700/50 px-3 py-1.5 rounded-lg shadow-2xs'>
            <span className='text-lg leading-none'>📝</span>
            <div className='d-flex flex-column justify-content-center'>
              <div className='text-[10px] text-slate-500 dark:text-neutral-400 font-medium leading-tight'>笔记总数</div>
              <div className='fw-bold text-primary dark:text-blue-400 text-sm leading-tight mt-0.5'>
                {loading ? '-' : stats.totalNotes}
              </div>
            </div>
          </div>

          {/* Stat 2: Folders Count */}
          <div className='d-flex align-items-center gap-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border border-emerald-200/50 dark:border-neutral-700/50 px-3 py-1.5 rounded-lg shadow-2xs'>
            <span className='text-lg leading-none'>📁</span>
            <div className='d-flex flex-column justify-content-center'>
              <div className='text-[10px] text-slate-500 dark:text-neutral-400 font-medium leading-tight'>分类目录</div>
              <div className='fw-bold text-emerald-600 dark:text-emerald-400 text-sm leading-tight mt-0.5'>
                {loading ? '-' : stats.totalFolders}
              </div>
            </div>
          </div>

          {/* Stat 3: Tags Count */}
          <div className='d-flex align-items-center gap-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border border-purple-200/50 dark:border-neutral-700/50 px-3 py-1.5 rounded-lg shadow-2xs'>
            <span className='text-lg leading-none'>🏷️</span>
            <div className='d-flex flex-column justify-content-center'>
              <div className='text-[10px] text-slate-500 dark:text-neutral-400 font-medium leading-tight'>标签总数</div>
              <div className='fw-bold text-purple-600 dark:text-purple-400 text-sm leading-tight mt-0.5'>
                {loading ? '-' : stats.totalTags}
              </div>
            </div>
          </div>

          {/* Action Button: New Note */}
          <button
            type='button'
            onClick={handleCreateNewNote}
            className='btn btn-primary btn-sm rounded-lg d-flex align-items-center gap-1.5 px-3 py-1.5 font-medium shadow-sm transition-all hover:scale-105 ms-1'>
            <span>+ 新建 MD 笔记</span>
          </button>
        </div>
      </div>
    </div>
  )
}
