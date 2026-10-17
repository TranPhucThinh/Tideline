// Render the real components with fixture data; never contact the account database.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const root = resolve(import.meta.dirname, '..');
const temp = await mkdtemp(join(tmpdir(), 'tideline-payables-view-'));
await writeFile(join(temp, 'navigation.js'), 'export async function invalidate() {}');
const server = await createServer({
  root, configFile: false, plugins: [svelte({ configFile: false })],
  resolve: { alias: { '$lib': join(root, 'src/lib'), '$app/navigation': join(temp, 'navigation.js') } },
  server: { middlewareMode: true, hmr: false, ws: false }, logLevel: 'error'
});

try {
  const { render } = await server.ssrLoadModule('svelte/server');
  const { default: Page } = await server.ssrLoadModule('/src/routes/(app)/payables/+page.svelte');
  const { default: ActionForm } = await server.ssrLoadModule('/src/lib/payables/ActionForm.svelte');
  const base = { provider: '', note: '', estimated: false, stop_from: null, count: null };
  const data = {
    today: '2026-10-17', loadError: null,
    payables: {
      settings: [{ effective_from: '2000-01-01', day_start: 25, default_income: 15000000 }],
      incomes: [], prices: [], overrides: [],
      items: [
        { ...base, id: 'subscription', name: 'Khoản định kỳ mẫu', kind: 'subscription', amount: 500000, first_due: '2026-09-20' },
        { ...base, id: 'once', name: 'Khoản một lần mẫu', kind: 'once', amount: 100000, first_due: '2026-10-20' }
      ]
    }
  };
  const html = render(Page, { props: { data } }).body;
  // 15m income - 600k current-cycle obligations - 500k prior arrears = 13.9m.
  // The adjusted balance must be visible without opening a disclosure.
  const withoutDisclosures = html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, '');
  assert.ok(/13\.900\.000/.test(withoutDisclosures), 'balance after prior arrears is hidden');
  assert.match(withoutDisclosures, /14\.400\.000/, 'current-cycle balance must remain distinct');

  const incomeHtml = render(ActionForm, { props: {
    action: 'income', cycle: { start: '2026-09-25', end: '2026-10-24', income: 15000000 },
    today: data.today, busy: false, onsave: async () => false
  } }).body;
  assert.match(incomeHtml, /25\/09\/2026[\s\S]*24\/10\/2026/, 'income edit omits selected cycle dates');

  data.payables.settings[0].default_income = null;
  const unknownIncome = render(Page, { props: { data } }).body;
  assert.match(unknownIncome, /Chưa có thu nhập dự kiến/);
  assert.doesNotMatch(unknownIncome, /13\.900\.000|14\.400\.000/);
  console.log('Payables view checks passed: visible arrears adjustment, selected cycle context, unknown income.');
} finally {
  await server.close();
  await rm(temp, { recursive: true, force: true });
}
