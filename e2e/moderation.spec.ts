import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { expect, request as playwrightRequest, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'

/**
 * GĐ5 admin journey (Working Plan GĐ5 WP8 / WP10) on the real stack through the Vite proxy: identity, safety-svc,
 * channel, stream, chat and media behind the Nginx edge, Mailpit for verification e-mails, the dev seed admin, and
 * ffmpeg for the live stream. Every target is created here through the API; nothing seeded is modified.
 *
 * One browser page is shared by the serial tests and moved around with in-app navigation: every full page load costs
 * a `POST /v1/auth/refresh`, and the edge allows only 10 `/v1/auth/*` requests a minute per IP.
 */

const BASE_URL = 'http://localhost:5174'
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025'
const RTMP = process.env.E2E_RTMP_URL ?? 'rtmp://localhost:1935/live'
const ADMIN = { login: 'admin@nexuslive.dev', password: process.env.E2E_SEED_PASSWORD ?? 'nexuslive123' }
const PASSWORD = 'passw0rdx'
const REASON = 'E2E kiểm thử: vi phạm quy định cộng đồng'

type Account = { id: string; username: string; email: string; token: string }

test.describe.configure({ mode: 'serial', timeout: 240_000 })

let api: APIRequestContext
let page: Page
let admin: { token: string; username: string }

/** POST to /v1/auth/* waiting out the edge limit (429 + Retry-After) instead of failing the run. */
async function authPost(path: string, data: unknown): Promise<APIResponse> {
  for (let attempt = 0; ; attempt++) {
    const res = await api.post(path, { data })
    if (res.status() !== 429 || attempt === 3) return res
    const wait = Number(res.headers()['retry-after'] ?? '20')
    await new Promise((r) => setTimeout(r, Math.min(65, Math.max(1, wait)) * 1000))
  }
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

async function register(prefix: string): Promise<Account> {
  const username = `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`.slice(0, 24)
  const email = `${username}@example.com`
  const res = await authPost('/v1/auth/register', { username, displayName: username, email, password: PASSWORD, acceptTerms: true })
  expect(res.status(), await res.text()).toBe(201)
  const { data } = await res.json()

  return { id: data.user.id as string, username, email, token: data.accessToken as string }
}

async function verifyEmail(account: Account) {
  const mailpit = await playwrightRequest.newContext({ baseURL: MAILPIT })
  let token = ''
  await expect
    .poll(
      async () => {
        const search = await mailpit.get(`/api/v1/search?query=${encodeURIComponent(`to:${account.email}`)}`)
        if (!search.ok()) return ''
        const { messages } = (await search.json()) as { messages?: { ID: string }[] }
        if (!messages?.length) return ''
        const message = await mailpit.get(`/api/v1/message/${messages[0].ID}`)
        const { Text, HTML } = (await message.json()) as { Text?: string; HTML?: string }
        token = /verify-email\?token=([A-Za-z0-9_\-.%]+)/.exec(`${Text ?? ''} ${HTML ?? ''}`)?.[1] ?? ''
        return token
      },
      { timeout: 30_000, message: `verification e-mail for ${account.email}` },
    )
    .not.toBe('')
  await mailpit.dispose()

  const res = await authPost('/v1/auth/verify-email', { token: decodeURIComponent(token) })
  expect(res.status(), await res.text()).toBe(200)
}

type Channel = { id: string; handle: string; displayName: string }

/** A fresh Creator: verified e-mail, application approved by the seed admin, channel created by channel-svc. */
async function creatorWithChannel(prefix: string): Promise<Account & { channel: Channel }> {
  const creator = await register(prefix)
  await verifyEmail(creator)

  const apply = await api.post('/v1/creator-applications', {
    headers: bearer(creator.token),
    data: { legalName: `E2E ${creator.username}`, birthDate: '2000-01-31', note: 'Playwright GĐ5', acceptCreatorTerms: true },
  })
  expect(apply.status(), await apply.text()).toBe(201)
  const applicationId = (await apply.json()).data.id as string
  const approve = await api.post(`/v1/admin/creator-applications/${applicationId}/approve`, { headers: bearer(admin.token) })
  expect(approve.status(), await approve.text()).toBe(200)

  let channel: Channel | undefined
  await expect(async () => {
    const res = await api.get('/v1/studio/channel', { headers: bearer(creator.token) })
    expect(res.status()).toBe(200)
    channel = (await res.json()).data as Channel
  }).toPass({ timeout: 20_000 })

  return { ...creator, channel: channel! }
}

/** Client-side navigation (react-router listens to popstate): no reload, so no extra refresh call. */
async function goInApp(path: string) {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

async function confirmAdminDialog(confirm: string, reasonLabel = 'Lý do') {
  const dialog = page.getByRole('alertdialog')
  await dialog.getByLabel(reasonLabel).fill(REASON)
  await dialog.getByRole('button', { name: confirm, exact: true }).click()
  await expect(dialog).toBeHidden()
}

async function expectAuditRow(resourceId: string, action: string) {
  await goInApp(`/audit-log?resourceId=${resourceId}`)
  await expect(page.getByRole('heading', { name: 'Nhật ký hệ thống' })).toBeVisible()
  await expect(page.getByTestId('audit-table').getByRole('row', { name: new RegExp(`^${action} bởi @${admin.username}$`) }).first()).toBeVisible({
    timeout: 20_000,
  })
}

test.beforeAll(async ({ browser }) => {
  api = await playwrightRequest.newContext({ baseURL: BASE_URL })
  const login = await authPost('/v1/auth/login', { login: ADMIN.login, password: ADMIN.password })
  expect(login.status(), await login.text()).toBe(200)
  const token = (await login.json()).data.accessToken as string
  const me = await api.get('/v1/me', { headers: bearer(token) })
  admin = { token, username: (await me.json()).data.user.username as string }

  page = await browser.newPage({ locale: 'vi-VN', viewport: { width: 1440, height: 900 } })
  await page.goto('/login')
  await page.getByLabel('Email hoặc tên người dùng').fill(ADMIN.login)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/\/creator-applications$/)
})

test.afterAll(async () => {
  await page?.close()
  await api?.dispose()
})

test('a report is resolved by locking the reported user, who can no longer sign in', async () => {
  const reporter = await register('e2erep')
  const offender = await register('e2eoff')

  const filed = await api.post('/v1/reports', {
    headers: bearer(reporter.token),
    data: { targetType: 'USER', targetId: offender.id, reason: 'HARASSMENT', note: 'Playwright: quấy rối trong chat' },
  })
  expect(filed.status(), await filed.text()).toBe(201)
  const reportId = (await filed.json()).data.id as string

  // Queue: sidebar → Báo cáo, narrowed to user reports for harassment (oldest first, so maybe behind "Tải thêm").
  await page.getByRole('navigation', { name: 'Điều hướng quản trị' }).getByRole('link', { name: /^Báo cáo/ }).click()
  await expect(page.getByRole('heading', { name: 'Báo cáo vi phạm' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Cần xử lý' })).toHaveAttribute('aria-selected', 'true')
  await page.getByLabel('Đối tượng').selectOption('USER')
  await page.getByLabel('Lý do').selectOption('HARASSMENT')
  const row = page.getByRole('row', { name: `Báo cáo về @${offender.username}, Mới` })
  const loadMore = page.getByRole('button', { name: 'Tải thêm' })
  await expect(page.getByTestId('reports-table').locator('tbody tr').first()).toBeVisible()
  for (let i = 0; i < 30 && !(await row.isVisible()); i++) {
    if (!(await loadMore.isVisible())) break
    await loadMore.click()
    await expect(loadMore.or(page.getByText('Đã hiện tất cả.'))).toBeVisible()
  }
  await row.click()
  await expect(page).toHaveURL(new RegExp(`/reports/${reportId}\\?`))

  const detail = page.getByTestId('report-detail')
  await expect(detail.getByText(`@${reporter.username}`)).toBeVisible()
  await expect(detail.getByText('Playwright: quấy rối trong chat')).toBeVisible()

  await detail.getByRole('button', { name: 'Nhận xử lý' }).click()
  await expect(detail.getByText('Bạn đang xử lý')).toBeVisible()

  await detail.getByRole('button', { name: 'Xử lý', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByRole('heading', { name: 'Xử lý báo cáo' })).toBeVisible()
  await dialog.getByRole('radio', { name: /^Khóa tài khoản/ }).check()
  await dialog.getByRole('radio', { name: '7 ngày' }).check()
  await confirmAdminDialog('Xác nhận xử lý', 'Lý do / kết luận')
  await expect(page.getByText(/^Đã xử lý (báo cáo|\d+ báo cáo)$/)).toBeVisible()
  await expect(detail.getByTestId('report-closed')).toContainText(`Đã xử lý bởi @${admin.username}`)

  // identity applies the lock (≤ 2 s): the account reads LOCKED and signing in is refused.
  await expect
    .poll(async () => (await (await api.get(`/v1/admin/users/${offender.id}`, { headers: bearer(admin.token) })).json()).data.status, {
      timeout: 15_000,
    })
    .toBe('LOCKED')
  const offenderLogin = await authPost('/v1/auth/login', { login: offender.username, password: PASSWORD })
  expect(offenderLogin.status()).toBe(403)
  expect((await offenderLogin.json()).error.code).toBe('ACCOUNT_LOCKED')

  // The Người dùng page shows the lock; its history and the audit log hold the entries.
  await detail.getByRole('link', { name: 'Xem người dùng' }).click()
  const user = page.getByTestId('user-detail')
  await expect(user.getByText(offender.email)).toBeVisible()
  await expect(user.getByText(/^Đã khóa tới /)).toBeVisible({ timeout: 35_000 })
  await expect(user.getByRole('button', { name: 'Mở khóa' })).toBeVisible()

  await expectAuditRow(offender.id, 'Khóa tài khoản')
  await expectAuditRow(reportId, 'Nhận xử lý báo cáo')
  await expectAuditRow(reportId, 'Xử lý báo cáo')
})

test('a channel is suspended and restored', async () => {
  const creator = await creatorWithChannel('e2esus')
  const { channel } = creator

  await page.getByRole('navigation', { name: 'Điều hướng quản trị' }).getByRole('link', { name: 'Kênh' }).click()
  await expect(page.getByRole('heading', { name: 'Kênh', exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Tìm kênh' }).fill(`@${channel.handle}`)
  await page.getByRole('button', { name: 'Tìm', exact: true }).click()
  await page.getByRole('row', { name: `${channel.displayName} (@${channel.handle})` }).click()

  const detail = page.getByTestId('channel-detail')
  await expect(detail.getByRole('link', { name: `@${creator.username}` })).toBeVisible()
  await detail.getByRole('button', { name: 'Tạm ngưng kênh' }).click()
  await expect(page.getByRole('alertdialog').getByRole('heading', { name: `Tạm ngưng kênh ${channel.displayName}?` })).toBeVisible()
  await confirmAdminDialog('Tạm ngưng kênh')
  await expect(page.getByText(`Đã tạm ngưng kênh ${channel.displayName}`)).toBeVisible()
  await expect(detail.locator('[data-status="SUSPENDED"]')).toBeVisible({ timeout: 35_000 })

  const profile = await api.get(`/v1/channels/${channel.handle}`)
  expect(profile.status()).toBe(403)
  expect((await profile.json()).error.code).toBe('CHANNEL_SUSPENDED')

  await detail.getByRole('button', { name: 'Mở lại kênh' }).click()
  await confirmAdminDialog('Mở lại kênh')
  await expect(page.getByText(`Đã mở lại kênh ${channel.displayName}`)).toBeVisible()
  await expect(detail.locator('[data-status="ACTIVE"]')).toBeVisible({ timeout: 35_000 })
  await expect.poll(async () => (await api.get(`/v1/channels/${channel.handle}`)).status(), { timeout: 15_000 }).toBe(200)

  await expectAuditRow(channel.id, 'Tạm ngưng kênh')
  await expectAuditRow(channel.id, 'Mở lại kênh')
})

test('a live stream is taken down', async () => {
  test.skip(spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0, 'ffmpeg is needed to go live')

  const creator = await creatorWithChannel('e2etd')
  const studio = await api.get('/v1/studio/stream', { headers: bearer(creator.token) })
  expect(studio.status()).toBe(200)
  const settings = (await studio.json()).data.settings as { language?: string }
  const title = `E2E gỡ ${creator.username}`
  const put = await api.put('/v1/studio/stream', {
    headers: bearer(creator.token),
    data: { title, tags: ['e2e'], language: settings.language || 'vi', isMature: false, categoryId: null },
  })
  expect(put.status(), await put.text()).toBe(200)
  const key = await api.post('/v1/studio/stream-key', { headers: bearer(creator.token) })
  expect(key.status()).toBe(201)
  const streamKey = (await key.json()).data.streamKey as string

  const ffmpeg: ChildProcess = spawn(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-re', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-g', '60', '-c:a', 'aac', '-t', '180', '-f', 'flv', `${RTMP}/${streamKey}`],
    { stdio: 'ignore' },
  )
  try {
    let streamId = ''
    await expect(async () => {
      const res = await api.get('/v1/streams?status=live&sort=newest&limit=50')
      const items = (await res.json()).data.items as { id: string; title: string; status: string }[]
      streamId = items.find((s) => s.title === title && s.status === 'LIVE')?.id ?? ''
      expect(streamId, `live stream "${title}"`).not.toBe('')
    }).toPass({ timeout: 60_000 })

    await page.getByRole('navigation', { name: 'Điều hướng quản trị' }).getByRole('link', { name: 'Buổi phát' }).click()
    await expect(page.getByRole('heading', { name: 'Buổi phát đang live' })).toBeVisible()
    const takedown = page.getByRole('button', { name: `Gỡ buổi phát “${title}”` })
    await expect(takedown).toBeVisible({ timeout: 35_000 })
    await takedown.click()
    await expect(page.getByRole('alertdialog').getByRole('heading', { name: `Gỡ buổi phát “${title}”?` })).toBeVisible()
    await confirmAdminDialog('Gỡ buổi phát')
    await expect(page.getByText('Đã gỡ buổi phát')).toBeVisible()

    await expect
      .poll(
        async () => {
          const { data } = await (await api.get(`/v1/streams/${streamId}`)).json()
          return `${data.status}/${data.endReason}`
        },
        { timeout: 15_000 },
      )
      .toBe('ENDED/admin_takedown')
    await expect(page.getByRole('button', { name: `Gỡ buổi phát “${title}”` })).toHaveCount(0, { timeout: 35_000 })

    await expectAuditRow(streamId, 'Gỡ buổi phát')
  } finally {
    ffmpeg.kill('SIGINT')
  }
})
