import { cycleOf, computeCycleLedger, shiftDays, prevCycle, nextCycle, currentCycle } from '../src/lib/cycle.ts';

let fail = 0;
const T = (name, cond) => { if (!cond) fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`); };

// 1) dayStart=1 => vòng = tháng dương lịch
let c = cycleOf('2026-08-15', 1);
T('mặc định S=1: start 1/8', c.start === '2026-08-01');
T('mặc định S=1: end 31/8', c.end === '2026-08-31');

// 2) payday S=21: ngày 15/8 thuộc vòng bắt đầu 21/7
c = cycleOf('2026-08-15', 21);
T('S=21, ngày 15/8: start 21/7', c.start === '2026-07-21');
T('S=21, ngày 15/8: end 20/8', c.end === '2026-08-20');

// ngày 25/8 thuộc vòng bắt đầu 21/8
c = cycleOf('2026-08-25', 21);
T('S=21, ngày 25/8: start 21/8', c.start === '2026-08-21');
T('S=21, ngày 25/8: end 20/9', c.end === '2026-09-20');

// 3) chính xác ngày start: 21/8 thuộc vòng 21/8
c = cycleOf('2026-08-21', 21);
T('S=21, đúng 21/8: start 21/8', c.start === '2026-08-21');

// 4) S=31 vào tháng 2 (clamp về cuối tháng)
c = cycleOf('2026-02-25', 31);
T('S=31, 25/2: vẫn trong vòng 31/1 (vì 28/2 > 25/2)', c.start === '2026-01-31');

// 5) prev/next cycle
const pc = prevCycle({ start: '2026-08-21', end: '2026-09-20' }, 21);
T('prev cycle start 21/7', pc.start === '2026-07-21');
const nc = nextCycle({ start: '2026-08-21', end: '2026-09-20' }, 21);
T('next cycle start 21/9', nc.start === '2026-09-21');

// 6) ledger reset + carry trong vòng payday
// vòng 21/7 -> 20/8, defaultLimit=100000
const spent = { '2026-07-21': 90000, '2026-07-22': 160000, '2026-07-23': 30000 };
const rows = computeCycleLedger({ start: '2026-07-21', end: '2026-08-20' }, 100000, spent);
const row = (d) => rows.find((r) => r.date === d);
T('cycle ngày1 limit reset 100000', row('2026-07-21').limit === 100000);
T('cycle ngày1 balance +10000', row('2026-07-21').balance === 10000);
T('cycle ngày2 limit 110000', row('2026-07-22').limit === 110000);
T('cycle ngày2 balance -50000', row('2026-07-22').balance === -50000);
T('cycle ngày3 limit 50000', row('2026-07-23').limit === 50000);
T('cycle ngày3 balance +20000', row('2026-07-23').balance === 20000);
T('cycle ngày4 limit 120000', row('2026-07-24').limit === 120000);

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
