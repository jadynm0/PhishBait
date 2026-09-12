import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const origin = process.env.TEST_APP_URL || 'http://localhost:3011';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  let saves = 0;
  await page.route('**/api/target-logs', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    saves++;
    const body = route.request().postDataJSON();
    assert.equal(body.fullName, 'Alex Example');
    assert.equal(body.email, 'alex@example.com');
    assert.equal(body.fieldsFilled, 5);
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.fulfill({ json: { id: 'test' } });
  });
  await page.goto(`${origin}/clone-portal/english-redelivery`);
  await page.getByRole('heading', { name: 'Arrange your redelivery' }).waitFor();
  await page.getByRole('button', { name: 'Confirm demo redelivery' }).click();
  assert.equal(saves, 0, 'empty form must not submit');
  await page.getByRole('button', { name: 'Fill sample data' }).click();
  await page.getByText('What makes this a phishing scenario?').click();
  assert.equal(saves, 0, 'help must not submit');
  await page.getByRole('button', { name: 'Reset form' }).click();
  assert.equal(await page.locator('[name=name]').inputValue(), '');
  assert.equal(saves, 0, 'reset must not submit');
  await page.getByRole('button', { name: 'Fill sample data' }).click();
  await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await page.getByRole('status').filter({ hasText: 'Demo submission saved' }).waitFor();
  assert.equal(saves, 1, 'duplicate in-flight submits must be ignored');
  assert.equal(await page.locator('[name=name]').inputValue(), '');
  await page.unroute('**/api/target-logs');
  await page.route('**/api/target-logs', route => route.fulfill({ status: 500, body: 'Test failure' }));
  await page.getByRole('button', { name: 'Fill sample data' }).click();
  await page.getByRole('button', { name: 'Confirm demo redelivery' }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('[name=name]').inputValue(), 'Alex Example', 'failed saves must preserve input');
  const clones = await (await page.request.get(`${origin}/api/clones`)).json();
  assert.ok(clones.clones.some(clone => clone.slug === 'english-redelivery'));
  console.log('PASS: validation, sample fill, help, reset, duplicate prevention, success, error recovery, clone discovery');
} finally {
  await browser.close();
}
