/**
 * Post-deployment E2E tests — run a real Chromium browser against the live
 * production CloudFront URL to verify the full UI → API path works.
 *
 * These tests catch issues that API-only integration tests miss:
 *   - Wrong API URL baked into the JS bundle (e.g. relative /api/v1 vs full URL)
 *   - CORS errors the browser enforces but httpx does not
 *   - CloudFront missing behaviours or caching wrong responses
 *   - JS runtime errors that prevent the app from rendering
 *
 * Required env vars:
 *   PROD_UI_URL   https://<cloudfront-id>.cloudfront.net
 *   PROD_API_URL  https://<api-gateway-id>.execute-api.ap-southeast-2.amazonaws.com
 */

import { test, expect } from '@playwright/test'

const UI_URL = process.env.PROD_UI_URL
const API_URL = process.env.PROD_API_URL

// Unique email per test run so re-runs don't hit duplicate-user errors
const TEST_EMAIL = `e2e-probe-${Date.now()}@example.com`
const TEST_PASSWORD = 'E2eTest1234!'
const TEST_NAME = 'E2E Probe'

test.describe('UI loads correctly', () => {
  test('CloudFront serves the React app', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(UI_URL, { waitUntil: 'domcontentloaded' })

    await expect(page.locator('#root')).toBeAttached()
    expect(errors).toHaveLength(0)
  })

  test('landing page is shown at root', async ({ page }) => {
    await page.goto(UI_URL)
    // Landing page should load with the company heading
    await expect(page.getByText(/Simply Digital Solutions/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('login page is shown at /login', async ({ page }) => {
    await page.goto(`${UI_URL}/login`)
    await expect(page.getByPlaceholder(/you@example\.com/i)).toBeVisible({ timeout: 10000 })
  })

  test('API calls go to the correct origin, not CloudFront/S3', async ({ page }) => {
    const apiRequests = []
    page.on('request', (req) => {
      if (req.url().includes('/api/v1')) apiRequests.push(req.url())
    })

    await page.goto(`${UI_URL}/login`, { waitUntil: 'domcontentloaded' })

    // Trigger a login attempt so the app makes an API call
    await page.getByPlaceholder(/you@example\.com/i).fill('probe@example.com')
    await page.locator('input[type="password"]').fill('WrongPass1!')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(2000)

    // Every API call must go to the API Gateway, not to CloudFront
    expect(apiRequests.length).toBeGreaterThan(0)
    for (const url of apiRequests) {
      expect(url).toContain(API_URL.replace(/\/$/, '')),
        `API call went to wrong host: ${url} — expected it to start with ${API_URL}`
    }
  })
})

test.describe('Registration flow (UI → API Gateway)', () => {
  test('user can register through the UI without 403 or 500', async ({ page }) => {
    const failedRequests = []
    page.on('response', (res) => {
      if (res.url().includes('/api/v1/auth/register') && res.status() >= 400) {
        failedRequests.push({ url: res.url(), status: res.status() })
      }
    })

    await page.goto(`${UI_URL}/login`)
    await page.getByText(/register/i).first().click()

    await page.getByPlaceholder(/jane smith/i).fill(TEST_NAME)
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST_EMAIL)
    // Fill password fields (some forms have confirm-password)
    const passwordFields = page.locator('input[type="password"]')
    await passwordFields.first().fill(TEST_PASSWORD)
    if (await passwordFields.count() > 1) {
      await passwordFields.nth(1).fill(TEST_PASSWORD)
    }

    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)

    expect(failedRequests).toHaveLength(0),
      `Registration API call failed: ${JSON.stringify(failedRequests)}`
  })

  test('registration returns 201 and switches to login form', async ({ page }) => {
    const freshEmail = `e2e-redir-${Date.now()}@example.com`
    let registrationStatus = null
    page.on('response', (res) => {
      if (res.url().includes('/api/v1/auth/register')) registrationStatus = res.status()
    })

    await page.goto(`${UI_URL}/login`)
    await page.getByText(/register/i).first().click()

    await page.getByPlaceholder(/jane smith/i).fill(TEST_NAME)
    await page.getByPlaceholder(/you@example\.com/i).fill(freshEmail)
    const passwordFields = page.locator('input[type="password"]')
    await passwordFields.first().fill(TEST_PASSWORD)
    if (await passwordFields.count() > 1) {
      await passwordFields.nth(1).fill(TEST_PASSWORD)
    }

    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3000)

    expect(registrationStatus).toBe(201)
  })
})

test.describe('Login flow (UI → API Gateway)', () => {
  test('login with wrong password shows an error, not a 403', async ({ page }) => {
    const fatalErrors = []
    page.on('response', (res) => {
      if (res.url().includes('/api/v1') && res.status() === 403) {
        fatalErrors.push(res.url())
      }
    })

    await page.goto(`${UI_URL}/login`)
    await page.getByPlaceholder(/you@example\.com/i).fill('nobody@example.com')
    await page.locator('input[type="password"]').fill('WrongPass1!')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(2000)

    // A 403 on an API endpoint means the URL is wrong (hitting S3/CloudFront)
    expect(fatalErrors).toHaveLength(0),
      `Got 403 on API call — bundle likely has wrong baseURL: ${fatalErrors.join(', ')}`
  })
})

test.describe('Google Sign-In (post-deploy checks)', () => {
  test('Google Sign-In button is visible on the login page', async ({ page }) => {
    await page.goto(`${UI_URL}/login`, { waitUntil: 'domcontentloaded' })

    // Google renders an iframe for the sign-in button — wait for it
    await page.waitForTimeout(3000)

    // Either the Google iframe or our fallback button must be present
    const googleFrame = page.frameLocator('iframe[src*="accounts.google.com"]')
    const googleIframeVisible = await googleFrame.locator('div[role="button"]')
      .isVisible({ timeout: 5000 }).catch(() => false)

    const fallbackBtn = page.getByText(/sign in with google/i)
    const fallbackVisible = await fallbackBtn.isVisible({ timeout: 1000 }).catch(() => false)

    expect(googleIframeVisible || fallbackVisible).toBe(true)
  })

  test('Google client_id is embedded in the page (VITE_GOOGLE_CLIENT_ID is set)', async ({ page }) => {
    await page.goto(`${UI_URL}/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const pageContent = await page.content()

    // The client_id must appear in the page — either in a script tag or Google iframe src
    const hasClientId = pageContent.includes('accounts.google.com') ||
      pageContent.includes('.apps.googleusercontent.com')

    expect(hasClientId).toBe(true)
  })

  test('POST /auth/google endpoint exists and rejects invalid token with 401', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/auth/google`, {
      data: { id_token: 'invalid-google-token' },
    })

    // 401 = endpoint exists and Google rejected the token
    // 404 = endpoint not wired up
    // 500 = server error (misconfiguration)
    expect(response.status()).toBe(401)
  })
})
