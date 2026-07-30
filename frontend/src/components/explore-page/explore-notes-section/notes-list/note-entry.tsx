/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { NoteTypeIcon } from '../../../common/note-type-icon/note-type-icon'
import { NoteTags } from '../../note-tags/note-tags'
import { Dropdown } from 'react-bootstrap'
import { UiIcon } from '../../../common/icons/ui-icon'
import { ThreeDotsVertical as IconThreeDotsVertical } from 'react-bootstrap-icons'
import { UserAvatarForUsername } from '../../../common/user-avatar/user-avatar-for-username'
import { DeleteNoteMenuEntry } from './delete-note-menu-entry'
import { formatChangedAt } from '../../../../utils/format-date'
import { useApplicationState } from '../../../../hooks/common/use-application-state'
import { deleteNote } from '../../../../api/notes'
import { useUiNotifications } from '../../../notifications/ui-notification-boundary'
import type { NoteExploreEntryInterface } from '@hedgedoc/commons'
import { useTranslatedText } from '../../../../hooks/common/use-translated-text'
import { Trans, useTranslation } from 'react-i18next'
import { PinNoteMenuEntry } from './pin-note-menu-entry'
import { SetTagsModal } from '../../../tags/set-tags-modal'
import styles from './note-entry.module.css'

interface NoteListEntryProps extends NoteExploreEntryInterface {
  isPinned: boolean
  showLastVisitedTime?: boolean
  updateExplorePage: () => void
}

/**
 * Renders a single note entry in the notes list.
 *
 * @param primaryAlias The primary alias of the note.
 * @param title The title of the note.
 * @param tags A list of tags of the note.
 * @param type The type of the note, e.g. slide or document.
 * @param lastChangedAt ISO string of the last time the note was changed.
 * @param lastVisitedAt ISO string of the last time the note was visited, can be null if not visited yet.
 * @param owner The username of the owner of the note, can be null if the note is owned by a guest.
 * @param isPinned Whether the note is pinned to the current user's explore page or not.
 * @param showLastVisitedTime Whether to show the last visited time instead of the last changed time. Defaults to false.
 * @param updateExplorePage Function to update the explore page this entry is used in.
 */
export const NoteListEntry: React.FC<NoteListEntryProps> = ({
  primaryAlias,
  title,
  tags,
  type,
  lastChangedAt,
  lastVisitedAt,
  owner,
  isPinned,
  showLastVisitedTime,
  updateExplorePage
}) => {
  useTranslation()
  const { showErrorNotificationBuilder } = useUiNotifications()
  const currentUser = useApplicationState((state) => state.user)
  const fallbackUntitled = useTranslatedText('editor.untitledNote')
  const [showTagModal, setShowTagModal] = React.useState(false)
  const onClickDeleteNote = useCallback(
    (keepMedia: boolean) => {
      deleteNote(primaryAlias, keepMedia)
        .then(updateExplorePage)
        .catch(showErrorNotificationBuilder('explore.notesList.deleteNoteError', { title }))
    },
    [title, primaryAlias, showErrorNotificationBuilder, updateExplorePage]
  )

  const relativeTime = useMemo(() => {
    if (showLastVisitedTime && lastVisitedAt) {
      return {
        key: 'explore.timestamps.lastVisited',
        value: formatChangedAt(lastVisitedAt)
      }
    }
    return {
      key: 'explore.timestamps.lastUpdated',
      value: formatChangedAt(lastChangedAt)
    }
  }, [showLastVisitedTime, lastVisitedAt, lastChangedAt])

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', primaryAlias)
      e.dataTransfer.effectAllowed = 'move'
    },
    [primaryAlias]
  )

  const [isDragOver, setIsDragOver] = React.useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    // Only accept drag if it has a tag: prefix or plain text
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const data = e.dataTransfer.getData('text/plain')
    if (data && data.startsWith('tag:')) {
      const tagName = data.substring(4)
      // Check if tag is already present
      if (tags.includes(tagName)) return

      try {
        const newTags = [...tags, tagName]
        const res = await fetch(`/api/v2/tags/note/${primaryAlias}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: newTags })
        })
        if (res.ok) {
          updateExplorePage()
        } else {
          const err = await res.json()
          showErrorNotificationBuilder('添加标签失败: ' + (err.message || '未知错误'))(new Error('Tagging failed'))
        }
      } catch (err) {
        showErrorNotificationBuilder('添加标签失败')(err as Error)
      }
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-top border-bottom py-3 d-flex align-items-center cursor-grab active:cursor-grabbing rounded px-2 transition-all user-select-none ${
        isDragOver
          ? 'bg-blue-50/50 dark:bg-blue-900/30 border-blue-400 border-dashed border-2 shadow-sm'
          : 'hover:bg-slate-50 dark:hover:bg-neutral-800/50'
      }`}>
      <span className={'mx-2'}>
        <Link href={`/n/${primaryAlias}`}>
          <NoteTypeIcon noteType={type} size={3} />
        </Link>
      </span>
      <div className={'flex-grow-1'}>
        <Link href={`/n/${primaryAlias}`} className={'text-decoration-none'}>
          {title !== '' ? title : <i className={'fst-italic'}>{fallbackUntitled}</i>}
        </Link>
        {tags.length > 0 && <br />}
        <NoteTags tags={tags} />
      </div>
      <div className={styles['metadata-box']}>
        <UserAvatarForUsername username={owner} />
        <br />
        <small className={'text-muted'}>
          <Trans i18nKey={relativeTime.key} values={{ timeAgo: relativeTime.value }} />
        </small>
      </div>
      <Dropdown>
        <Dropdown.Toggle variant={'secondary'} className={'no-arrow'}>
          <UiIcon icon={IconThreeDotsVertical} />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => setShowTagModal(true)}>
            <UiIcon icon={() => <span>🏷️</span>} className={'me-2'} />
            设置标签
          </Dropdown.Item>
          <DeleteNoteMenuEntry
            noteTitle={title}
            isOwner={owner !== null && currentUser?.username === owner}
            onConfirm={onClickDeleteNote}
          />
          <PinNoteMenuEntry noteAlias={primaryAlias} isPinned={isPinned} />
        </Dropdown.Menu>
      </Dropdown>

      <SetTagsModal
        show={showTagModal}
        onHide={() => setShowTagModal(false)}
        noteAlias={primaryAlias}
        currentTags={tags}
        onSuccess={updateExplorePage}
      />
    </div>
  )
}
