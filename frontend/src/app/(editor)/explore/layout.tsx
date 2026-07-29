'use client'

/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { PropsWithChildren } from 'react'
import React, { Fragment, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { Welcome } from '../../../components/explore-page/welcome'
import { PinnedNotes } from '../../../components/explore-page/pinned-notes/pinned-notes'
import { loadPinnedNotes } from '../../../redux/pinned-notes/methods'
import { useUiNotifications } from '../../../components/notifications/ui-notification-boundary'
import { FolderTree } from '../../../components/tree/folder-tree'
import { TagCloud } from '../../../components/tags/tag-cloud'

export type ExploreLayoutProps = PropsWithChildren

/**
 * Layout for the explore page with FolderTree & TagCloud sidebar on the left and children on the right.
 * @param children The content to show on the right
 */
export default function ExploreLayout({ children }: ExploreLayoutProps) {
  const { showErrorNotificationBuilder } = useUiNotifications()
  useEffect(() => {
    loadPinnedNotes().catch(showErrorNotificationBuilder('explore.pinnedNotes.loadingError'))
  }, [showErrorNotificationBuilder])

  return (
    <Fragment>
      <Container fluid className='px-4 py-3'>
        <Welcome />
        <Row className='mt-4'>
          <Col md={4} lg={3} className='border-end pe-3 mb-4'>
            <div className='card shadow-sm p-3 mb-3 border-0 bg-light-subtle'>
              <FolderTree />
            </div>
            <div className='card shadow-sm p-3 border-0 bg-light-subtle'>
              <TagCloud />
            </div>
          </Col>
          <Col md={8} lg={9} className='ps-md-4'>
            <PinnedNotes />
            <div className='mt-3'>{children}</div>
          </Col>
        </Row>
      </Container>
    </Fragment>
  )
}
