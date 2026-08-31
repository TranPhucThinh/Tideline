import { cycleOf, computeCycleLedger, shiftDays, prevCycle, nextCycle, currentCycle } from '../src/lib/cycle.ts';
import { createLimitLookups, constLimit } from '../src/lib/settings.ts';

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
const rows = computeCycleLedger({ start: '2026-07-21', end: '2026-08-20' }, constLimit(100000), spent);
const row = (d) => rows.find((r) => r.date === d);
T('cycle ngày1 limit reset 100000', row('2026-07-21').limit === 100000);
T('cycle ngày1 balance +10000', row('2026-07-21').balance === 10000);
T('cycle ngày2 limit 110000', row('2026-07-22').limit === 110000);
T('cycle ngày2 balance -50000', row('2026-07-22').balance === -50000);
T('cycle ngày3 limit 50000', row('2026-07-23').limit === 50000);
T('cycle ngày3 balance +20000', row('2026-07-23').balance === 20000);
T('cycle ngày4 limit 120000', row('2026-07-24').limit === 120000);

// ---- NON-RETROACTIVE: đổi default_limit giữa vòng ----
// Vòng 21/7 -> 20/8. default 100k từ 01/7; đổi lên 150k có hiệu lực từ 2026-07-25.
const nrSettings = [
  { id: 'a', default_limit: 100000, day_start: 21, effective_from: '2026-07-01', created_at: '2026-07-01T00:00:00Z' },
  { id: 'b', default_limit: 150000, day_start: 21, effective_from: '2026-07-25', created_at: '2026-07-25T00:00:00Z' }
];
const { defaultLimitForDate, dayStartForDate } = createLimitLookups(nrSettings);
const nrRows = computeCycleLedger({ start: '2026-07-21', end: '2026-08-20' }, defaultLimitForDate, spent);
const nrr = (d) => nrRows.find((r) => r.date === d);
// Ngày trước ngày đổi (24/7) vẫn dùng default 100k: limit = 100k + balance(23/7)=100k+20k=120k
T('non-retroactive: 24/7 trước khi đổi vẫn dùng default 100k (limit 120000)', nrr('2026-07-24').limit === 120000);
// Ngày từ 25/7 trở đi dùng default mới 150k: limit = 150k + balance(24/7) = 150k + 120k = 270k
T('non-retroactive: 25/7 từ ngày đổi dùng default 150k (limit 270000)', nrr('2026-07-25').limit === 270000);

// ---- NON-RETROACTIVE day_start: đổi day_start giữa vòng, vòng đang chạy giữ ranh giới (option a) ----
// user đang trong vòng 21/7 -> 20/8 (day_start=21). Đổi day_start sang 1 có hiệu lực 2026-08-05
// (GIỮA vòng). Vòng đang chạy phải GIỮ ranh giới cũ 21/7 -> 20/8.
const dsSettings = [
  { id: 'a', default_limit: 100000, day_start: 21, effective_from: '2026-07-01', created_at: '2026-07-01T00:00:00Z' },
  { id: 'b', default_limit: 100000, day_start: 1, effective_from: '2026-08-05', created_at: '2026-08-05T00:00:00Z' }
];
const { dayStartForDate: dsDayStart } = createLimitLookups(dsSettings);
const dsCycle = cycleOf('2026-08-10', dsDayStart);
T('day_start đổi giữa vòng: vòng hiện tại giữ ranh giới cũ start 21/7', dsCycle.start === '2026-07-21');
T('day_start đổi giữa vòng: vòng hiện tại giữ ranh giới cũ end 20/8', dsCycle.end === '2026-08-20');

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
