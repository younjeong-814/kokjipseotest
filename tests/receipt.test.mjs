import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/receipt/parseReceipt.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { groupRows, parseReceipt, cleanName, readQuantity } = exports;

const word = (text, x, y) => ({ text, box: [x, y, x + 40, y + 20] });

test('groups column-ordered words into rows by vertical position', () => {
  // Vision이 이름 열을 먼저, 금액 열을 나중에 읽은 경우
  const words = [word('두부', 10, 100), word('대파', 10, 130), word('2,500', 200, 102), word('2,000', 200, 131), word('1', 150, 99), word('1', 150, 129)];
  assert.deepEqual(groupRows(words), ['두부 1 2,500', '대파 1 2,000']);
});

test('extracts items between header and total, with quantity, date and time', () => {
  const result = parseReceipt([
    '콕집서 마트',
    '구매 영수증',
    '2026.10.13 14:30',
    '상품명 수량 금액',
    '001 CJ 행복한콩 두부(300g) 2 5,000',
    '대파 1 2,000',
    '서울우유 1L 1 3,200',
    '종량제봉투 10L 1 500',
    '대파 1 2,000',
    '합계 12,700원',
    '카드 결제 12,700',
  ]);
  assert.equal(result.date, '2026-10-13');
  assert.equal(result.time, '14:30');
  assert.deepEqual(result.items.map(({ name, quantity }) => [name, quantity]), [
    ['CJ 행복한콩 두부', 2],
    ['대파', 2],
    ['서울우유', 1],
  ]);
});

test('attaches quantity printed on the following barcode line', () => {
  const { items } = parseReceipt(['상품명', '양파 1.5kg', '8801234567890 3 2,990 8,970', '합계 8,970']);
  assert.deepEqual(items.map(({ name, quantity }) => [name, quantity]), [['양파', 3]]);
});

test('cleans product names', () => {
  assert.equal(cleanName('*[행사] 국산 깐마늘 200g'), '국산 깐마늘');
  assert.equal(cleanName('12345 6,000'), '');
});

test('reads quantity in "unit price, quantity, amount" order', () => {
  const { items } = parseReceipt(['상품명 단가 수량 금액', '풀무원 국산콩 두부 2,500 2 5,000', '양파 3,980 1 3,980', '서울우유 1L 2,980 3 8,940', '합계 17,920']);
  assert.deepEqual(items.map(({ name, quantity }) => [name, quantity]), [['풀무원 국산콩 두부', 2], ['양파', 1], ['서울우유', 3]]);
  assert.equal(readQuantity(['2', '1,000', '2,000']), 2);
  assert.equal(readQuantity(['1', '2,500']), 1);
  assert.equal(readQuantity(['2,500']), 1);
});

test('keeps tax-marked items and stops at purchase total', () => {
  const { items } = parseReceipt(['품명 수량 금액', '(면세)계란 10구 1 4,990', '행사할인 -500', '바나나우유 2 3,400', '종량제봉투 10L 1 500', '총 구매액 8,390']);
  assert.deepEqual(items.map(({ name, quantity }) => [name, quantity]), [['계란', 1], ['바나나우유', 2]]);
});

test('sums duplicates when quantity is on the following barcode line', () => {
  const { items } = parseReceipt(['상품명', '두부', '8801234567890 2 2,500 5,000', '두부', '8801234567890 1 2,500 2,500', '합계 7,500']);
  assert.deepEqual(items.map(({ name, quantity }) => [name, quantity]), [['두부', 3]]);
});

test('reads two-digit years', () => {
  assert.equal(parseReceipt(['26.10.13 18:00', '상품명', '고등어 1 5,900', '합계 5,900']).date, '2026-10-13');
});
