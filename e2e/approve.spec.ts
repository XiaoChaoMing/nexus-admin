import { expect, request as playwrightRequest, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * M1 admin journey (Working Plan GĐ1 §12) against the real stack through the Vite proxy:
 * identity behind the Nginx edge, Mailpit for the verification email, dev seed admin.
 *
 * Applicants are driven through their own API context so their refresh cookie never lands in the
 * browser (on localhost `nxl_rt` would otherwise be shared with the admin app: cookies ignore ports).
 */

const BASE_URL = 'http://localhost:5174'
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025'
const ADMIN = { login: 'admin@nexuslive.dev', password: process.env.E2E_SEED_PASSWORD ?? 'nexuslive123' }
const PASSWORD = 'passw0rdx'

type Applicant = { username: string; email: string; token: string; api: APIRequestContext }

async function register(): Promise<Applicant> {
  const api = await playwrightRequest.newContext({ baseURL: BASE_URL })
  const username = `e2e${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`
  const email = `${username}@example.com`
  const res = await api.post('/v1/auth/register', {
    data: { username, displayName: username, email, password: PASSWORD, acceptTerms: true },
  })
  expect(res.status(), await res.text()).toBe(201)
  const { data } = await res.json()

  return { username, email, token: data.accessToken as string, api }
}

/** Waits for the VERIFY email in Mailpit and returns the token from its link. */
async function verificationToken(email: string): Promise<string> {
  const mailpit = await playwrightRequest.newContext({ baseURL: MAILPIT })
  let token = ''

  await expect
    .poll(
      async () => {
        const search = await mailpit.get(`/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
        if (!search.ok()) return ''
        const { messages } = (await search.json()) as { messages: { ID: string }[] }
        if (!messages?.length) return ''

        const message = await mailpit.get(`/api/v1/message/${messages[0].ID}`)
        const { Text, HTML } = (await message.json()) as { Text?: string; HTML?: string }
        token = /verify-email\?token=([A-Za-z0-9_-]+)/.exec(`${Text ?? ''} ${HTML ?? ''}`)?.[1] ?? ''
        return token
      },
      { timeout: 20_000, message: `verification email for ${email}` },
    )
    .not.toBe('')

  await mailpit.dispose()
  return token
}

async function verifiedApplicantWithApplication(): Promise<Applicant & { applicationId: string }> {
  const applicant = await register()

  const verify = await applicant.api.post('/v1/auth/verify-email', { data: { token: await verificationToken(applicant.email) } })
  expect(verify.status(), await verify.text()).toBe(200)

  const submit = await applicant.api.post('/v1/creator-applications', {
    headers: { Authorization: `Bearer ${applicant.token}` },
    data: { legalName: `E2E ${applicant.username}`, birthDate: '2000-01-31', note: 'Playwright', acceptCreatorTerms: true },
  })
  expect(submit.status(), await submit.text()).toBe(201)
  const { data } = await submit.json()
  expect(data.status).toBe('PENDING')

  return { ...applicant, applicationId: data.id as string }
}

async function signIn(page: Page, login: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email hoặc tên người dùng').fill(login)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
}

test('admin approves a fresh creator application', async ({ page }) => {
  const applicant = await verifiedApplicantWithApplication()

  await signIn(page, ADMIN.login, ADMIN.password)
  await expect(page).toHaveURL(/\/creator-applications$/)
  await expect(page.getByRole('heading', { name: 'Đơn đăng ký Creator' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Chờ duyệt' })).toHaveAttribute('aria-selected', 'true')

  // Oldest first: the new application may sit behind "Tải thêm".
  const row = page.getByRole('row', { name: new RegExp(`Đơn của ${applicant.username},`) })
  const loadMore = page.getByRole('button', { name: 'Tải thêm' })
  await expect(page.getByTestId('applications-table').locator('tbody tr').first()).toBeVisible()
  for (let i = 0; i < 20 && !(await row.isVisible()); i++) {
    if (!(await loadMore.isVisible())) break
    await loadMore.click()
    await expect(loadMore.or(page.getByText('Đã hiện tất cả đơn.'))).toBeVisible()
  }
  await row.click()

  await expect(page).toHaveURL(new RegExp(`/creator-applications/${applicant.applicationId}$`))
  const detail = page.getByTestId('application-detail')
  await expect(detail.getByText(applicant.email)).toBeVisible()
  await expect(detail.getByText('Đã xác minh')).toBeVisible()
  await expect(detail.getByText(`E2E ${applicant.username}`)).toBeVisible()

  await detail.getByRole('button', { name: 'Duyệt', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByRole('heading', { name: `Duyệt đơn của ${applicant.username}?` })).toBeVisible()
  await dialog.getByRole('button', { name: 'Duyệt đơn' }).click()

  await expect(page.getByText(`Đã duyệt đơn của ${applicant.username}.`)).toBeVisible()
  await expect(detail.getByText('Đã duyệt').first()).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0)

  // The applicant sees the decision (and the link to the detail stays valid).
  const mine = await applicant.api.get('/v1/creator-applications/me', { headers: { Authorization: `Bearer ${applicant.token}` } })
  expect((await mine.json()).data.status).toBe('APPROVED')
  await page.reload()
  await expect(page.getByTestId('application-detail').getByText('Đã duyệt').first()).toBeVisible()

  await applicant.api.dispose()
})

test('a normal account sees the no-permission screen and the admin API answers 403', async ({ page }) => {
  const viewer = await register()

  await signIn(page, viewer.username, PASSWORD)
  await expect(page.getByRole('heading', { name: 'Tài khoản không có quyền quản trị' })).toBeVisible()
  await expect(page.getByTestId('applications-table')).toHaveCount(0)

  const res = await viewer.api.get('/v1/admin/creator-applications', { headers: { Authorization: `Bearer ${viewer.token}` } })
  expect(res.status()).toBe(403)
  expect((await res.json()).error.code).toBe('FORBIDDEN')

  // Logout (X-NXL-Client: admin) returns to the login page and the session does not come back on reload.
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/creator-applications')
  await expect(page).toHaveURL(/\/login$/)

  await viewer.api.dispose()
})
