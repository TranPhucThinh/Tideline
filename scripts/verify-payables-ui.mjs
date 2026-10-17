// Browser contract tests mount the real page with fixture data. Database/RLS are
// tested separately by verify-payables-db.sql; this never contacts production.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..');
const temp = await mkdtemp(join(tmpdir(), 'tideline-payables-ui-'));
const base = { provider: 'Ví dụ', note: '', estimated: false, stop_from: null, count: null };
const fixture = {
  today: '2026-10-17', loadError: null,
  payables: {
    settings: [{ effective_from: '2000-01-01', day_start: 25, default_income: 15000000 }], incomes: [], prices: [],
    items: [
      { ...base, id: 'loan', name: 'Trả góp điện thoại', kind: 'installment', amount: 2200000, first_due: '2026-09-30', count: 6 },
      { ...base, id: 'sub', name: 'ChatGPT Plus', kind: 'subscription', amount: 500000, first_due: '2026-09-20' },
      { ...base, id: 'once', name: 'Đơn hàng Shopee', kind: 'once', amount: 100000, first_due: '2026-10-20' }
    ],
    overrides: [{ item_id: 'once', sequence: 0, amount: 120000, paid_on: null }]
  }
};
await symlink(join(root, 'node_modules'), join(temp, 'node_modules'), 'dir');
await writeFile(join(temp, 'navigation.js'), `export async function invalidate() { window.dispatchEvent(new Event('fixture-refresh')); }`);
await writeFile(join(temp, 'index.html'), '<html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script type="module" src="/main.js"></script></html>');
await writeFile(join(temp, 'main.js'), `import { mount } from 'svelte'; import Harness from './Harness.svelte'; mount(Harness, { target: document.getElementById('app') });`);
await writeFile(join(temp, 'fixture.css'), `@import ${JSON.stringify(join(root, 'src/app.css'))};\n@source ${JSON.stringify(join(root, 'src'))};`);
await writeFile(join(temp, 'Harness.svelte'), `
<script>
import Page from ${JSON.stringify(join(root, 'src/routes/(app)/payables/+page.svelte'))};
import './fixture.css';
let data = $state(${JSON.stringify(fixture)});
window.__fixtureData = ${JSON.stringify(fixture)};
window.addEventListener('fixture-refresh', () => { data = structuredClone(window.__fixtureData); });
</script>
<div class="app-appearance mx-auto min-h-screen max-w-5xl p-5" data-ui-style="modern" data-ui-theme="modern-0"><Page {data}/></div>`);

const server = await createServer({ root: temp, configFile: false, plugins: [svelte({ configFile: false }), tailwindcss()], resolve: { alias: { '$lib': join(root,'src/lib'), '$app/navigation': join(temp,'navigation.js') } }, server: { host: '127.0.0.1', port: 5198, strictPort: true, fs: { allow: [temp, root] } }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let lastRequest;
  let rejectSave = false;
  await page.route('**/payables/manage', async route => {
    lastRequest = route.request().postDataJSON();
    if (rejectSave) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Lỗi thử nghiệm: vui lòng thử lại.' }) });
    if (['pay', 'undo'].includes(lastRequest.action)) {
      await page.evaluate(({ action, payload }) => {
        const p = window.__fixtureData.payables;
        const existing = p.overrides.find(o => o.item_id === payload.id && o.sequence === payload.sequence);
        if (action === 'undo') existing.paid_on = null;
        else if (existing) Object.assign(existing, { amount: payload.amount, paid_on: payload.paid_on });
        else p.overrides.push({ item_id: payload.id, sequence: payload.sequence, amount: payload.amount, paid_on: payload.paid_on });
      }, lastRequest);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('http://127.0.0.1:5198');
  await page.getByRole('heading', { name: 'Khoản phải trả', exact: true }).waitFor();
  await page.getByText('12.180.000 đ', { exact: true }).waitFor();
  assert.equal(await page.locator('[aria-label="Các phần khoản phải trả"]').evaluate(el => getComputedStyle(el).display), 'grid', 'view controls must fit the available width');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile page overflows horizontally');
  await page.screenshot({ path: '/private/tmp/tideline-payables-mobile.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: '/private/tmp/tideline-payables-desktop.png', animations: 'disabled' });
  await page.evaluate(() => { const shell = document.querySelector('.app-appearance'); shell.dataset.uiStyle = 'skeuomorphic'; shell.dataset.uiTheme = 'skeuomorphic-0'; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/private/tmp/tideline-payables-soft-mobile.png', fullPage: true, animations: 'disabled' });
  assert.equal(await page.getByRole('button', { name: '+ Thêm khoản', exact: true }).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(238, 145, 123)', 'soft primary actions must use the existing coral token');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'soft style overflows on mobile');
  await page.evaluate(() => { const shell = document.querySelector('.app-appearance'); shell.dataset.uiStyle = 'modern'; shell.dataset.uiTheme = 'modern-0'; });

  // Closing and reopening a form must preserve a draft without saving anything.
  await page.getByRole('button', { name: '+ Thêm khoản', exact: true }).click();
  await page.getByRole('dialog', { name: 'Thêm khoản phải trả', exact: true }).waitFor();
  await page.getByLabel('Tên khoản', { exact: true }).fill('Bản nháp đang nhập');
  await page.locator('#payable-amount').fill('230000');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: '+ Thêm khoản', exact: true }).click();
  assert.equal(await page.getByLabel('Tên khoản', { exact: true }).inputValue(), 'Bản nháp đang nhập');
  assert.equal(await page.locator('#payable-amount').inputValue(), '230.000');
  assert.equal(lastRequest, undefined, 'draft restoration must not save financial data');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  // Repeated schedules expose one actionable occurrence initially, with a way back.
  await page.getByRole('button', { name: 'ChatGPT Plus', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Chi tiết khoản', exact: true });
  await detail.waitFor();
  assert.equal(await detail.getByRole('button', { name: 'Đánh dấu đã trả', exact: true }).count(), 1);
  await detail.getByRole('button', { name: 'Sửa thông tin', exact: true }).click();
  await page.getByRole('dialog', { name: 'Chỉnh sửa khoản', exact: true }).waitFor();
  await page.getByLabel('Tên khoản', { exact: true }).fill('Tên đang sửa');
  await page.getByRole('button', { name: 'Quay lại chi tiết khoản', exact: true }).click();
  await detail.getByRole('button', { name: 'Sửa thông tin', exact: true }).click();
  assert.equal(await page.getByLabel('Tên khoản', { exact: true }).inputValue(), 'Tên đang sửa');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();

  // A rename must preserve the effective one-off amount, not restore the original 100k.
  await page.getByRole('button', { name: 'Đơn hàng Shopee', exact: true }).click();
  await page.getByRole('button', { name: 'Sửa thông tin', exact: true }).click();
  assert.equal(await page.locator('#payable-amount').inputValue(), '120.000');
  await page.getByLabel('Tên khoản', { exact: true }).fill('Tên trong bản nháp');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  // Another successful adjustment may update the data while an edit draft is closed.
  await page.evaluate(() => { window.__fixtureData.payables.overrides[0].amount = 200000; window.dispatchEvent(new Event('fixture-refresh')); });
  await page.getByRole('button', { name: 'Đơn hàng Shopee', exact: true }).click();
  await page.getByRole('button', { name: 'Sửa thông tin', exact: true }).click();
  assert.equal(await page.locator('#payable-amount').inputValue(), '200.000', 'restored name draft must not overwrite a newer amount');
  assert.equal(await page.getByLabel('Tên khoản', { exact: true }).inputValue(), 'Tên trong bản nháp');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.evaluate(() => { window.__fixtureData.payables.overrides[0].amount = 120000; window.dispatchEvent(new Event('fixture-refresh')); });
  await page.getByRole('button', { name: 'Đơn hàng Shopee', exact: true }).click();
  await page.getByRole('button', { name: 'Sửa thông tin', exact: true }).click();
  await page.getByLabel('Tên khoản', { exact: true }).fill('Đơn hàng đã đổi tên');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.getByRole('status').waitFor();
  assert.equal(lastRequest.payload.amount, 120000);
  assert.equal(lastRequest.action, 'edit');

  // A one-off beyond the overview's projection horizon must retain its override too.
  await page.evaluate(() => { window.__fixtureData.payables.items.find(i => i.id === 'once').first_due = '2027-06-20'; window.dispatchEvent(new Event('fixture-refresh')); });
  await page.getByRole('button', { name: 'Tất cả khoản', exact: true }).click();
  await page.getByRole('button', { name: /Đơn hàng Shopee/ }).click();
  await page.getByRole('button', { name: 'Sửa thông tin', exact: true }).click();
  assert.equal(await page.locator('#payable-amount').inputValue(), '120.000', 'future one-off override was lost');
  await page.getByLabel('Tên khoản', { exact: true }).fill('Khoản xa đã đổi tên');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.getByRole('status').waitFor();
  assert.equal(lastRequest.payload.amount, 120000);
  await page.evaluate(() => { window.__fixtureData.payables.items.find(i => i.id === 'once').first_due = '2026-10-20'; window.dispatchEvent(new Event('fixture-refresh')); });
  await page.getByRole('button', { name: 'Theo kỳ lương', exact: true }).click();

  // Real page recomputation: paying/undoing changes unpaid, never frees the reserved salary.
  await page.getByText('Chi tiết dự tính', { exact: true }).click();
  await page.getByRole('button', { name: 'Đánh dấu đã trả', exact: true }).first().click();
  await page.getByRole('button', { name: 'Xác nhận đã trả', exact: true }).click();
  await page.getByRole('status').waitFor();
  await page.getByText('Chưa trả', { exact: true }).locator('..').getByText('620.000 đ', { exact: true }).waitFor();
  await page.getByText('12.180.000 đ', { exact: true }).waitFor();
  assert.equal(lastRequest.payload.paid_on, '2026-10-17');
  await page.getByRole('button', { name: 'Hoàn tác đã trả', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.getByText('Chưa trả', { exact: true }).locator('..').getByText('2.820.000 đ', { exact: true }).waitFor();

  // A failed save must retain input and keep the dialog open.
  await page.getByRole('button', { name: '+ Thêm khoản', exact: true }).click();
  await page.getByLabel('Tên khoản', { exact: true }).fill('Khoản cần giữ khi lỗi');
  await page.locator('#payable-amount').fill('350000');
  rejectSave = true;
  await page.getByRole('button', { name: 'Thêm khoản phải trả', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByLabel('Tên khoản', { exact: true }).inputValue(), 'Khoản cần giữ khi lỗi');
  assert.equal(await page.locator('dialog').isVisible(), true);
  rejectSave = false;
  await page.getByRole('button', { name: 'Thêm khoản phải trả', exact: true }).click();
  await page.getByRole('status').waitFor();
  assert.equal(lastRequest.payload.amount, 350000);
  assert.equal(lastRequest.action, 'create');

  // Simulation is read-only and includes only next-cycle subscription payments.
  const beforeSimulation = JSON.stringify(lastRequest);
  await page.getByRole('button', { name: 'Cắt giảm', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByText('Tạm loại 500.000 đ khỏi dự tính kỳ tới', { exact: true }).waitFor();
  assert.equal(JSON.stringify(lastRequest), beforeSimulation);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: '/private/tmp/tideline-payables-savings.png', fullPage: true });

  // Unknown income cannot be rendered as zero. Load errors must hide financial totals.
  await page.evaluate(() => { window.__fixtureData.payables.settings[0].default_income = null; window.dispatchEvent(new Event('fixture-refresh')); });
  await page.getByRole('button', { name: 'Theo kỳ lương', exact: true }).click();
  await page.getByText('Chưa có thu nhập dự kiến', { exact: true }).first().waitFor();
  await page.evaluate(() => { window.__fixtureData.loadError = 'Lỗi tải dữ liệu thử nghiệm'; window.dispatchEvent(new Event('fixture-refresh')); });
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByText('Tổng nghĩa vụ', { exact: true }).count(), 0);
  await page.evaluate(() => { window.__fixtureData.loadError = null; window.__fixtureData.payables.settings = []; window.dispatchEvent(new Event('fixture-refresh')); });
  await page.getByLabel('Ngày bắt đầu kỳ lương', { exact: true }).fill('31');
  await page.locator('#payable-salary').fill('0');
  await page.getByRole('button', { name: 'Bắt đầu theo dõi', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu theo dõi', exact: true }).waitFor({ state: 'visible' });
  assert.equal(lastRequest.action, 'settings');
  assert.equal(lastRequest.payload.income, 0);
  assert.equal(lastRequest.payload.day_start, 31);
  assert.deepEqual(errors, []);
  console.log('Payables browser checks passed: responsive layouts, named dialogs, draft restoration and reconciliation, detail navigation, override preservation, pay/undo totals, retry input, simulation, unknown income, load failure, setup.');
} finally {
  await browser?.close();
  await server.close();
  await rm(temp, { recursive: true, force: true });
}
