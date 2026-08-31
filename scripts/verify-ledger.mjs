import { computeMonthLedger, addMonths, monthIsAfter, monthKeyToString, parseMonthKey } from '../src/lib/ledger.ts';
import { formatMoney, formatSignedMoney, parseMoneyInput } from '../src/lib/money.ts';

// ---- Ví dụ spec mục 3 ----
const spentByDate = { '2023-02-01': 90000, '2023-02-02': 160000, '2023-02-03': 30000 };
const rows = computeMonthLedger({ year: 2023, month: 2, defaultLimit: 100000, spentByDate });
const row = (d) => rows.find((r) => r.day === d);
let fail = 0;
const checks = [
  ['N1 limit', row(1).limit, 100000], ['N1 balance', row(1).balance, 10000],
  ['N2 limit', row(2).limit, 110000], ['N2 balance', row(2).balance, -50000],
  ['N3 limit', row(3).limit, 50000], ['N3 balance', row(3).balance, 20000],
  ['N4 limit', row(4).limit, 120000],
];
for (const [n, got, want] of checks) { const ok = got === want; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${n}: ${got} / ${want}`); }

// ---- Reset ngày 1 tháng mới ----
const febRows = computeMonthLedger({ year: 2023, month: 2, defaultLimit: 100000, spentByDate: {} });
// tháng mới reset: ngày 1 limit = defaultLimit bất kể số dư hôm trước là gì
const febEndBalance = febRows[febRows.length - 1].balance; // hôm nay là last ngày
// Mô phỏng: ngày 1 tháng 3 tới phải reset về 100000, không cộng dồn
const marRows = computeMonthLedger({ year: 2023, month: 3, defaultLimit: 100000, spentByDate: {} });
const resetOk = marRows[0].limit === 100000;
if (!resetOk) fail++;
console.log(`${resetOk ? 'PASS' : 'FAIL'} Reset tháng mới: ngày 1 limit = 100000 (không cộng dồn từ tháng trước, balance tháng trước cuối = ${febEndBalance})`);

// ---- helper month ----
const m = { year: 2023, month: 2 };
const next = addMonths(m, 1);
const okNext = next.year === 2023 && next.month === 3;
if (!okNext) fail++;
console.log(`${okNext ? 'PASS' : 'FAIL'} addMonths tháng sau`);
const okPrev = addMonths(m, -1).month === 1;
if (!okPrev) fail++;
console.log(`${okPrev ? 'PASS' : 'FAIL'} addMonths tháng trước`);
const okKey = monthKeyToString(m) === '2023-02';
if (!okKey) fail++;
console.log(`${okKey ? 'PASS' : 'FAIL'} monthKeyToString`);
const okParse = JSON.stringify(parseMonthKey('2023-02')) === JSON.stringify(m);
if (!okParse) fail++;
console.log(`${okParse ? 'PASS' : 'FAIL'} parseMonthKey`);
const okIsAfter = monthIsAfter({year:2023,month:3}, {year:2023,month:2}) && !monthIsAfter({year:2023,month:2},{year:2023,month:2});
if (!okIsAfter) fail++;
console.log(`${okIsAfter ? 'PASS' : 'FAIL'} monthIsAfter`);

// ---- money ----
const f1 = formatMoney(1234567); const okF1 = f1 === '1.234.567 đ';
if (!okF1) fail++;
console.log(`${okF1 ? 'PASS' : 'FAIL'} formatMoney ${f1}`);
const fs = formatSignedMoney(10000); const okFs = fs === '+10.000 đ';
if (!okFs) fail++;
console.log(`${okFs ? 'PASS' : 'FAIL'} formatSignedMoney ${fs}`);
const p1 = parseMoneyInput('50000'); const okP1 = p1 === 50000;
if (!okP1) fail++;
console.log(`${okP1 ? 'PASS' : 'FAIL'} parseMoneyInput số nguyên`);
const p2 = parseMoneyInput('1.234.000'); const okP2 = p2 === 1234000;
if (!okP2) fail++;
console.log(`${okP2 ? 'PASS' : 'FAIL'} parseMoneyInput có dấu chấm`);
const p0 = parseMoneyInput('0'); const okP0 = p0 === null;
if (!okP0) fail++;
console.log(`${okP0 ? 'PASS' : 'FAIL'} parseMoneyInput chặn 0/âm`);
const pNeg = parseMoneyInput('-5'); const okNeg = pNeg === null;
if (!okNeg) fail++;
console.log(`${okNeg ? 'PASS' : 'FAIL'} parseMoneyInput chặn âm`);

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
