import assert from 'node:assert/strict';
import { test } from 'node:test';
import { salaryCycle, monthlyDate, occurrences, summarize, statusOf, simulateSavings, validateItem } from '../src/lib/payables/domain.ts';

const settings = [{ effective_from: '2000-01-01', day_start: 25, default_income: 15000000 }];
const item = { id: 'a', name: 'Trả góp', provider: '', note: '', kind: 'installment', amount: 2200000, first_due: '2026-10-31', count: 6, estimated: false, stop_from: null };

test('salary cycles include payday and exclude the next payday', () => {
  assert.deepEqual(salaryCycle('2026-10-24', settings), { start: '2026-09-25', end: '2026-10-24', income: 15000000 });
  assert.deepEqual(salaryCycle('2026-10-25', settings), { start: '2026-10-25', end: '2026-11-24', income: 15000000 });
});
test('month-end anchors recover after February, including leap years', () => {
  assert.equal(monthlyDate('2024-01-31', 1), '2024-02-29');
  assert.equal(monthlyDate('2024-01-31', 2), '2024-03-31');
  assert.deepEqual(salaryCycle('2026-02-28', [{ ...settings[0], day_start: 31 }]), { start: '2026-02-28', end: '2026-03-30', income: 15000000 });
});
test('a salary-day change preserves the current cycle and creates a contiguous transition', () => {
  const changed = [...settings, { effective_from: '2026-11-25', day_start: 10, default_income: 16000000 }];
  assert.deepEqual(salaryCycle('2026-11-24', changed), { start: '2026-10-25', end: '2026-11-24', income: 15000000 });
  assert.deepEqual(salaryCycle('2026-11-25', changed), { start: '2026-11-25', end: '2026-12-09', income: 16000000 });
  assert.deepEqual(salaryCycle('2026-12-10', changed), { start: '2026-12-10', end: '2027-01-09', income: 16000000 });
});
test('installments end after the requested count and retain their original monthly anchor', () => {
  const rows = occurrences([item], [], [], '2027-12-31');
  assert.deepEqual(rows.map(r => r.due), ['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31']);
  assert.equal(rows.reduce((sum, r) => sum + r.amount, 0), 13200000);
});
test('subscription projection catches up without storing duplicate occurrences', () => {
  const sub = { ...item, kind: 'subscription', count: null, stop_from: '2027-03-01' };
  const first = occurrences([sub], [], [], '2028-12-31');
  assert.equal(first.length, 5);
  assert.deepEqual(occurrences([sub], [], [], '2028-12-31'), first);
});
test('price changes preserve paid snapshots and single-installment overrides', () => {
  const revisions = [{ item_id: 'a', from_sequence: 1, amount: 2500000 }];
  const payments = [{ item_id: 'a', sequence: 1, amount: 2200000, paid_on: '2026-11-29' }, { item_id: 'a', sequence: 5, amount: 2100000, paid_on: null }];
  assert.deepEqual(occurrences([item], revisions, payments, '2027-04-01').map(r => r.amount), [2200000,2200000,2500000,2500000,2500000,2100000]);
});
test('paid future occurrences remain visible even after a subscription stop', () => {
  const sub = { ...item, kind: 'subscription', stop_from: '2026-11-01' };
  const rows = occurrences([sub], [], [{ item_id: 'a', sequence: 2, amount: 2200000, paid_on: '2026-10-20' }], '2027-01-01');
  assert.deepEqual(rows.map(r => r.due), ['2026-10-31', '2026-12-31']);
});
test('paying changes outstanding but never increases projected remainder', () => {
  const cycle = salaryCycle('2026-10-30', settings);
  const before = summarize(occurrences([item], [], [], cycle.end), cycle, '2026-10-30');
  const after = summarize(occurrences([item], [], [{ item_id: 'a', sequence: 0, amount: 2200000, paid_on: '2026-10-30' }], cycle.end), cycle, '2026-10-30');
  assert.equal(before.remaining, 12800000);
  assert.equal(after.remaining, 12800000);
  assert.equal(after.unpaid, 0);
  assert.equal(after.paid, 2200000);
});
test('arrears are separate from this cycle and future cycles do not treat not-yet-due bills as arrears', () => {
  const rows = occurrences([item], [], [], '2027-01-31');
  const current = summarize(rows, salaryCycle('2026-12-01', settings), '2026-12-01');
  assert.equal(current.total, 2200000);
  assert.equal(current.arrears, 2200000);
  assert.equal(current.afterArrears, 10600000);
  const future = summarize(rows, salaryCycle('2027-01-01', settings), '2026-12-01');
  assert.equal(future.arrears, 4400000);
});
test('unknown income stays unknown and explicit zero income produces a deficit', () => {
  const cycle = { start: '2026-10-25', end: '2026-11-24', income: null };
  const rows = occurrences([item], [], [], cycle.end);
  assert.equal(summarize(rows, cycle, '2026-10-30').remaining, null);
  assert.equal(summarize(rows, { ...cycle, income: 0 }, '2026-10-30').remaining, -2200000);
});
test('late payment retains the original due cycle and historical snapshots exclude later payments', () => {
  const rows = occurrences([item], [], [{ item_id: 'a', sequence: 0, amount: 2200000, paid_on: '2026-12-01' }], '2026-12-31');
  const old = summarize(rows, salaryCycle('2026-11-01', settings), '2026-12-02');
  assert.equal(old.total, 2200000);
  assert.equal(old.paid, 0);
  assert.equal(old.unpaid, 2200000);
});
test('due states distinguish today, within seven days, late and paid', () => {
  assert.equal(statusOf({ due: '2026-10-17', paid_on: null }, '2026-10-17'), 'today');
  assert.equal(statusOf({ due: '2026-10-24', paid_on: null }, '2026-10-17'), 'soon');
  assert.equal(statusOf({ due: '2026-10-25', paid_on: null }, '2026-10-17'), 'pending');
  assert.equal(statusOf({ due: '2026-10-16', paid_on: null }, '2026-10-17'), 'overdue');
  assert.equal(statusOf({ due: '2026-10-16', paid_on: '2026-10-16' }, '2026-10-17'), 'paid');
});
test('simulation includes only unpaid subscriptions in the target cycle and never mutates data', () => {
  const sub = { ...item, id: 's', kind: 'subscription', amount: 500000 };
  const rows = occurrences([item, sub], [], [], '2026-12-31');
  const snapshot = JSON.stringify(rows);
  assert.equal(simulateSavings(rows, { start: '2026-11-25', end: '2026-12-24' }, ['a', 's']), 500000);
  assert.equal(JSON.stringify(rows), snapshot);
});
test('rejects malformed amounts, dates, missing names and unbounded installments', () => {
  assert.equal(validateItem(item), null);
  for (const change of [{ amount: 0 }, { amount: 1.5 }, { amount: Infinity }, { first_due: '2026-02-30' }, { name: ' ' }, { count: 0 }, { count: 601 }, { kind: 'other' }]) {
    assert.equal(typeof validateItem({ ...item, ...change }), 'string');
  }
});
