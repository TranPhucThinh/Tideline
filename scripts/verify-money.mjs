import assert from 'node:assert/strict';
import * as money from '../src/lib/money.ts';

// A missing evaluator, stripped operators, or permissive number parsing must fail this suite.
assert.equal(typeof money.parseMoneyExpression, 'function', 'Money expressions need their own evaluator');
const parse = money.parseMoneyExpression;

const valid = [
  ['20000+15000-10000', 25000],
  ['20.000 + 15.000 − 10.000', 25000],
  ['  20000\t+\u00a015000  ', 35000],
  ['00020+00030', 50],
  ['10000-20000+30000', 20000],
  ['0+1', 1],
  ['9.007.199.254.740.991', 9007199254740991],
  ['9007199254740990+1', 9007199254740991]
];
for (const [input, value] of valid) {
  assert.deepEqual(parse(input), { status: 'valid', value }, input);
}
for (const input of ['', ' \t\u00a0']) {
  assert.equal(parse(input).status, 'empty', JSON.stringify(input));
}
for (const input of ['20000+', '20.000 -  ']) {
  assert.equal(parse(input).status, 'incomplete', input);
}
const invalid = [
  '20000++10000', '20000+-10000', '--10000', '-10000+20000', '+10000',
  '20000*2', '(20000+10000)', '20k', '1e6', '20,5', '20.00', '1..000',
  '20 000', '20\u00a0000', '20000đ', '20000\n+10000', '20000/2',
  '20.00+', '9007199254740992', '9007199254740991+1-1',
  '0-9007199254740991-1+9007199254740991', '1'.repeat(201)
];
for (const input of invalid) {
  const result = parse(input);
  assert.equal(result.status, 'invalid', input);
  assert.ok(result.message, input);
}
for (const [input, value] of [['0', 0], ['10000-10000', 0], ['10000-20000', -10000]]) {
  const result = parse(input);
  assert.equal(result.status, 'invalid', input);
  assert.equal(result.value, value, input);
}
// An unfinished edit must never reuse a previous preview.
assert.equal(parse('20000+10000').value, 30000);
assert.equal(parse('20000+').value, undefined);

// The existing settings parser keeps its contract.
assert.equal(money.parseMoneyInput('20.000'), 20000);
assert.equal(money.parseMoneyInput('20,5'), 21);
assert.equal(money.parseMoneyInput('20000+10000'), null);
console.log(`PASS money expressions: ${valid.length + invalid.length + 11} cases, settings parsing unchanged`);
