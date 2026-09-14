import { test, expect } from '@playwright/test';

test('Copilot no context, unavailable provider, thinking and retryable error states', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Copilot Tester');
  await page.getByLabel('Email address').fill(`copilot-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('Password1!');
  await page.getByLabel('Date of birth').fill('2003-06-15');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hello, Copilot.' })).toBeVisible();
  await page.goto('/applications');
  await page.getByRole('button', { name: 'Copilot', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'SUBMIT-SAFE Copilot' });
  await expect(panel).toContainText('Select a loan type, product or application');
  await panel.getByRole('button', { name: 'Close Copilot' }).click();
  await page.route('**/copilot/context', async route => {
    const response = await route.fetch(); const json = await response.json();
    await route.fulfill({ response, json: { ...json, provider: { mode: 'DISABLED', available: false } } });
  });
  await page.goto('/loans/education');
  await page.getByRole('button', { name: 'Copilot', exact: true }).click();
  await expect(panel).toContainText('AI unavailable');
  await expect(panel.getByRole('button', { name: 'Why am I not ready?', exact: true })).toBeDisabled();
  await expect(panel).toContainText('First rules-based action');
  await page.unroute('**/copilot/context');
  await panel.getByRole('button', { name: 'Refresh current findings' }).click();
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/copilot/chat', async route => {
    const response = await route.fetch(); const json = await response.json();
    await pending;
    await route.fulfill({ response, json: { ...json, status: 'provider_error', answer: 'The AI provider could not return a grounded response. Please retry.', references: [] } });
  });
  await panel.getByRole('button', { name: 'Why am I not ready?', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Reading your current application');
  release();
  await expect(panel.getByRole('region', { name: 'Copilot response' })).toContainText('Provider error');
  await page.unroute('**/copilot/chat');
  await panel.getByRole('button', { name: 'What should I fix next?', exact: true }).click();
  await expect(panel.getByRole('region', { name: 'Copilot response' })).toContainText('Upload AADHAAR');
  await panel.getByLabel('Ask about this application').fill('Am I approved?');
  await panel.getByRole('button', { name: 'Ask Copilot', exact: true }).click();
  await expect(panel.getByRole('region', { name: 'Copilot response' })).toContainText('unavailable');
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Copilot', exact: true })).toBeFocused();
});
