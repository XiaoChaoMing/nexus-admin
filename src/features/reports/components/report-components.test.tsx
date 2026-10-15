import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { DataTable } from '@/components/admin/data-table'
import { EvidenceList } from '@/features/reports/components/evidence-list'
import { ReportStatusBadge } from '@/features/reports/components/report-badges'
import { AccountStatusBadge } from '@/features/users/components/account-status-badge'
import type { AdminReportDetail } from '@/features/reports/types'

beforeAll(async () => {
  await i18n.changeLanguage('vi')
})

type EvidenceReport = Pick<AdminReportDetail, 'targetType' | 'target' | 'evidence' | 'evidenceStatus'>

const messageReport = (overrides: Partial<EvidenceReport> = {}): EvidenceReport => ({
  targetType: 'MESSAGE',
  target: { id: 'm2', label: '@an: mua follow giá rẻ', link: '/live/s1', userId: 'u-an' },
  evidenceStatus: 'CAPTURED',
  evidence: [
    { messageId: 'm1', userId: 'u-an', username: null, displayName: null, body: 'xin chào', fragments: [], createdAt: '2026-10-15T13:14:00Z', deleted: false },
    { messageId: 'm2', userId: 'u-an', username: null, displayName: null, body: 'mua follow giá rẻ', fragments: [], createdAt: '2026-10-15T13:14:05Z', deleted: true },
  ],
  ...overrides,
})

describe('EvidenceList', () => {
  it('highlights the reported message and keeps the original text of deleted ones', () => {
    const html = renderToStaticMarkup(<EvidenceList report={messageReport()} />)
    expect(html).toContain('data-testid="evidence-list"')
    expect(html.match(/<li/g)).toHaveLength(2)
    expect(html).toMatch(/data-reported="true"[^>]*>.*Tin bị báo cáo.*Đã xóa.*mua follow giá rẻ/s)
    expect(html).toContain('@an')
  })

  it('names other authors from the username the server sends', () => {
    const other = { messageId: 'm0', userId: 'u-binh', username: 'binh', displayName: 'Bình', body: 'hi', fragments: [], createdAt: '2026-10-15T13:13:00Z', deleted: false }
    const html = renderToStaticMarkup(<EvidenceList report={messageReport({ evidence: [other] })} />)
    expect(html).toContain('@binh')
    expect(html).not.toContain('#u-binh')
  })

  it('explains missing evidence', () => {
    expect(renderToStaticMarkup(<EvidenceList report={messageReport({ evidenceStatus: 'UNAVAILABLE', evidence: [] })} />)).toContain(
      'Không lấy được tin nhắn',
    )
    expect(
      renderToStaticMarkup(<EvidenceList report={messageReport({ targetType: 'STREAM', target: { id: 's', label: 'Live', link: null, userId: 'o' } })} />),
    ).toContain('Báo cáo buổi phát và kênh không kèm tin nhắn chat.')
    expect(renderToStaticMarkup(<EvidenceList report={messageReport({ evidenceStatus: 'NONE', evidence: [] })} />)).toContain('Không có tin nhắn đính kèm.')
  })
})

describe('status badges', () => {
  it('always carry text, not only colour', () => {
    expect(renderToStaticMarkup(<ReportStatusBadge status="IN_REVIEW" />)).toMatch(/data-status="IN_REVIEW"[^>]*>Đang xử lý</)
    expect(renderToStaticMarkup(<AccountStatusBadge status="LOCKED" lockedUntil={null} />)).toContain('Khóa vĩnh viễn')
    expect(renderToStaticMarkup(<AccountStatusBadge status="LOCKED" lockedUntil="2000-01-01T00:00:00Z" />)).toContain('Hoạt động')
    expect(renderToStaticMarkup(<AccountStatusBadge status="LOCKED" lockedUntil="2999-01-01T00:00:00Z" />)).toContain('Đã khóa tới')
  })
})

describe('DataTable', () => {
  const columns = [{ id: 'name', header: 'Tên', cell: (r: { id: string; name: string }) => r.name }]
  const base = { testId: 't', caption: 'c', columns, rowKey: (r: { id: string }) => r.id, onRetry: () => {}, empty: 'Trống' }

  it('marks the selected row and gives the roving tab stop to it', () => {
    const html = renderToStaticMarkup(
      <DataTable {...base} rows={[{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]} loading={false} error={null} selectedKey="b" onSelect={() => {}} hasMore />,
    )
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).toMatch(/tabindex="0" aria-current="true"/)
    expect(html).toContain('Tải thêm')
  })

  it('shows the empty message, or the error with a retry', () => {
    expect(renderToStaticMarkup(<DataTable {...base} rows={[]} loading={false} error={null} />)).toContain('Trống')
    const failed = renderToStaticMarkup(<DataTable {...base} rows={[]} loading={false} error="Lỗi mạng" />)
    expect(failed).toContain('role="alert"')
    expect(failed).toContain('Thử lại')
    expect(failed).not.toContain('Trống')
  })
})
