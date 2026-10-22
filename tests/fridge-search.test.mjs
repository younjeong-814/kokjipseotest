import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadTs(url) {
  const source = readFileSync(url, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', 'require', compiled)(exports, path => loadTs(new URL(`${path}.ts`, url)));
  return exports;
}
const { parseQuery, matchIngredient, searchIngredients, orderByRank } = loadTs(new URL('../src/features/fridge/search.ts', import.meta.url));

const item = (id, name, category = '채소') => ({ id, name, category });
const names = (items, raw) => orderByRank(items, searchIngredients(items, parseQuery(raw))).map(value => value.name);

test('query parsing follows input states', () => {
  for (const raw of ['', '   ', '·%-']) assert.deepEqual(parseQuery(raw), { type: 'idle' });
  for (const raw of ['ㄷ', 'ㅏㅣ', 'ㄷ부']) assert.deepEqual(parseQuery(raw), { type: 'hold' });
  assert.deepEqual(parseQuery('ㄷㅂ'), { type: 'choseong', keyword: 'ㄷㅂ', raw: 'ㄷㅂ' });
  assert.equal(parseQuery('파').keyword, '파');
  assert.equal(parseQuery('두ㅂ').keyword, '두');
  assert.equal(parseQuery(' 조선 간장 ').keyword, '조선간장');
  assert.equal(parseQuery('SPAM').keyword, 'spam');
  assert.equal(parseQuery('3분').keyword, '3분');
});

test('single syllable ingredients are searchable', () => {
  const items = ['무', '파', '쌀', '김', '꿀'].map((name, index) => item(String(index), name));
  for (const value of items) assert.deepEqual(names(items, value.name), [value.name]);
});

test('brand names match by partial name, ignoring spaces and symbols', () => {
  const items = [item('1', '샘표 조선국간장', '조미료·소스'), item('2', '스팸 클래식', '가공식품')];
  for (const raw of ['샘표', '간장', '조선 국간장', '표조선']) assert.deepEqual(names(items, raw), ['샘표 조선국간장']);
  assert.deepEqual(names(items, 'ㅅㅍ'), ['샘표 조선국간장', '스팸 클래식']);
  assert.deepEqual(names(items, '된장'), []);
});

test('results are grouped exact, prefix, contains, then category', () => {
  const items = [item('1', '대파'), item('2', '파프리카'), item('3', '파'), item('4', '쪽파'), item('5', '파스타소스', '조미료·소스')];
  assert.deepEqual(names(items, '파'), ['파', '파프리카', '파스타소스', '대파', '쪽파']);
  const sauces = [item('1', '굴소스', '조미료·소스'), item('2', '케첩', '조미료·소스')];
  assert.deepEqual(names(sauces, '소스'), ['굴소스', '케첩']);
});

test('category matches anywhere only from two characters', () => {
  const items = [item('1', '시금치', '채소'), item('2', '케첩', '조미료·소스')];
  assert.deepEqual(names(items, '채'), []);
  assert.deepEqual(names(items, '채소'), ['시금치']);
  assert.deepEqual(names(items, '료소'), ['케첩']);
  assert.deepEqual(matchIngredient(items[1], parseQuery('소스')), { rank: 5, category: true });
});

test('highlight range points at the original name', () => {
  const sauce = item('1', '샘표 조선국간장');
  assert.deepEqual(matchIngredient(sauce, parseQuery('표조')).ranges, [[1, 4]]);
  assert.deepEqual(matchIngredient(sauce, parseQuery('ㄱㄱㅈ')).ranges, [[5, 8]]);
});

test('spaced words match when every word appears, in any order', () => {
  const items = [item('1', '샘표 국간장', '조미료·소스'), item('2', '샘표 간장', '조미료·소스'), item('3', '샘표 된장', '조미료·소스')];
  assert.deepEqual(names(items, '샘표 간장'), ['샘표 간장', '샘표 국간장']);
  assert.deepEqual(names(items, '간장 샘표'), ['샘표 국간장', '샘표 간장']);
  assert.deepEqual(names(items, '샘표 고추장'), []);
  assert.deepEqual(names(items, '샘표간장'), ['샘표 간장']);
  assert.deepEqual(names(items, '샘표 간ㅈ'), ['샘표 간장', '샘표 국간장']);
  assert.deepEqual(matchIngredient(items[0], parseQuery('샘표 간장')), { rank: 3, ranges: [[0, 2], [4, 6]] });
  assert.deepEqual(matchIngredient(item('4', '대파'), parseQuery('파 파')).ranges, [[1, 2]]);
});

test('spaced words rank after contiguous matches and before category', () => {
  const items = [item('1', '시판 국간장', '조미료·소스'), item('2', '국간장 시판용', '조미료·소스')];
  assert.deepEqual(names(items, '국간장 시판'), ['국간장 시판용', '시판 국간장']);
});
