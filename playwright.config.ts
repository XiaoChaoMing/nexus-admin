import { defineConfig, devices } from '@playwright/test'

/**
 * E2E against the real stack through the Vite proxy (/v1 → Nginx edge :8080, Mailpit :8025), e.g.
 * `make nxl-up-all` in nexuslive-be with the dev seed enabled. The dev server is started here.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    // Selectors use the Vietnamese copy; the UI follows the browser language on first visit.
    locale: 'vi-VN',
    launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, locale: 'vi-VN' } }],
  webServer: {
    command: 'pnpm dev --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
  },
})
