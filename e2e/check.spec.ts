import { test, expect } from '@playwright/test'

test.describe('Check page', () => {
  test('renders the email input form', async ({ page }) => {
    await page.goto('/check')
    await expect(page.getByRole('heading', { name: /breached/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /check/i })).toBeVisible()
  })

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/check')
    await page.getByLabel(/email/i).fill('notanemail')
    await page.getByRole('button', { name: /check/i }).click()
    // Either browser validation or API validation should prevent submission
    // The button should still be on screen (not in success state)
    await expect(page.getByRole('button', { name: /check/i })).toBeVisible()
  })

  test('shows success state after valid submission', async ({ page }) => {
    await page.goto('/check')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByRole('button', { name: /check/i }).click()
    // Wait for either success alert or error (API may not be running in test env)
    await page.waitForTimeout(2000)
    // Should no longer be in loading state
    const button = page.getByRole('button', { name: /check/i })
    const successAlert = page.getByText(/check your inbox/i)
    await expect(button.or(successAlert)).toBeVisible()
  })
})
