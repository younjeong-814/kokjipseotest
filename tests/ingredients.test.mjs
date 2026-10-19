import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/ingredients/repository.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { INGREDIENTS_KEY, loadIngredients, saveIngredient, deleteIngredient, validateDraft } = exports;
const { updateIngredientDetails, recordIngredientCondition, saveRecognizedIngredients } = exports;
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const draft = { name: ' 시금치 ', category: '채소', storage: '냉장', quantity: 2, unit: '봉', date: '2026-10-20' };

const homeExports = {};
const homeSource = readFileSync(new URL('../src/features/home/selectHomeIngredients.ts', import.meta.url), 'utf8');
new Function('exports', ts.transpileModule(homeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(homeExports);
test('home chooses expiry priority including expired, today and D-3; missing dates are not urgent', () => {
  const today = new Date(2026, 9, 17, 23, 59);
  const make = (id, date) => ({ ...draft, id, date, createdAt: '2026-10-15T00:00:00Z' });
  const items = [make('missing', ''), make('later', '2026-10-21'), make('three', '2026-10-20'), make('today', '2026-10-17'), make('expired', '2026-10-16'), make('one', '2026-10-18')];
  const result = homeExports.selectHomeIngredients(items, today);
  assert.equal(result.mode, 'urgent');
  assert.deepEqual(result.entries.map(value => [value.item.id, value.days]), [['expired', -1], ['today', 0], ['one', 1], ['three', 3]]);
  assert.equal(items[0].id, 'missing');
  assert.equal(homeExports.selectHomeIngredients([make('three', '2026-10-20')], new Date(2026, 9, 16)).mode, 'recent');
});
test('home falls back to four latest registrations and handles empty and unknown dates', () => {
  const items = [1,2,3,4,5].map(i => ({ ...draft, id: String(i), date: i === 1 ? '' : '2026-12-31', createdAt: `2026-10-${String(i).padStart(2, '0')}T00:00:00Z`, updatedAt: '2026-10-17T00:00:00Z' }));
  const result = homeExports.selectHomeIngredients(items, new Date(2026, 9, 17));
  assert.equal(result.mode, 'recent');
  assert.deepEqual(result.entries.map(value => value.item.id), ['5','4','3','2']);
  assert.equal(homeExports.selectHomeIngredients([items[0]], new Date(2026, 9, 17)).entries[0].days, null);
  assert.deepEqual(homeExports.selectHomeIngredients([], new Date()).entries, []);
});

test('info modal updates only metadata and rejects quantity changes after consumption', () => {
  const db = storage();
  const [item] = saveIngredient(db, draft);
  const [edited] = exports.updateIngredientInfo(db, item.id, { name: '수정 시금치', quantity: 300, unit: 'g' });
  assert.equal(edited.quantity, 300);
  assert.equal(edited.unit, 'g');
  assert.equal(edited.date, draft.date);
  updateIngredientDetails(db, item.id, { storage: '냉동', date: draft.date, remainingPercent: 75 });
  assert.throws(() => exports.updateIngredientInfo(db, item.id, { name: '다시 수정', quantity: 4, unit: '개' }));
  const [renamed] = exports.updateIngredientInfo(db, item.id, { name: '이름만 수정' });
  assert.equal(renamed.name, '이름만 수정');
  assert.equal(renamed.quantity, 300);
  assert.equal(renamed.remainingPercent, 75);
  assert.equal(renamed.storage, '냉동');
  updateIngredientDetails(db, item.id, { storage: '냉동', date: draft.date, remainingPercent: 100 });
  assert.throws(() => exports.updateIngredientInfo(db, item.id, { name: '복구 후 수정', quantity: 4 }));
  assert.throws(() => exports.updateIngredientInfo(db, item.id, { name: '' }));
});

test('legacy records load as manual and gain defaults without losing data', () => {
  const db = storage();
  const now = new Date().toISOString();
  db.setItem(INGREDIENTS_KEY, JSON.stringify([{ ...draft, id: 'legacy', createdAt: now, updatedAt: now }]));
  assert.equal(loadIngredients(db)[0].id, 'legacy');
  const [item] = saveIngredient(db, draft, 'legacy');
  assert.equal(item.source, 'manual');
  assert.equal(item.remainingPercent, 100);
  assert.deepEqual(item.conditionHistory, []);
});
test('detail updates and chronological condition events survive metadata edits', () => {
  const db = storage();
  const [item] = saveIngredient(db, draft);
  updateIngredientDetails(db, item.id, { storage: '냉동', date: '2026-10-22', remainingPercent: 25 });
  recordIngredientCondition(db, item.id, '싱싱해요');
  const firstEvent = loadIngredients(db)[0].conditionHistory[0];
  recordIngredientCondition(db, item.id, '시들시들해요');
  saveIngredient(db, { ...draft, name: '수정', storage: '냉동', date: '2026-10-22' }, item.id);
  const saved = loadIngredients(db)[0];
  assert.equal(saved.remainingPercent, 25);
  assert.equal(saved.conditionHistory.length, 2);
  assert.equal(saved.conditionHistory[0].status, '시들시들해요');
  assert.equal(saved.conditionHistory[1].id, firstEvent.id);
  assert.ok(Number.isFinite(Date.parse(firstEvent.recordedAt)));
  assert.throws(() => updateIngredientDetails(db, item.id, { storage: '냉동', date: '', remainingPercent: 10 }));
});
test('OCR and camera provenance persist across edits; batch failures are atomic', () => {
  const db = storage();
  saveRecognizedIngredients(db, [{ ...draft, source: 'ocr' }, { ...draft, name: '두부', source: 'camera' }]);
  const loaded = loadIngredients(db);
  assert.deepEqual(loaded.map(item => item.source), ['ocr', 'camera']);
  saveIngredient(db, { ...draft, source: 'manual' }, loaded[0].id);
  assert.equal(loadIngredients(db)[0].source, 'ocr');
  const before = db.getItem(INGREDIENTS_KEY);
  assert.throws(() => saveRecognizedIngredients(db, [draft, { ...draft, name: '' }]));
  assert.equal(db.getItem(INGREDIENTS_KEY), before);
});
test('condition storage failures leave existing history and details unchanged', () => {
  const db = storage();
  const [item] = saveIngredient(db, draft);
  const before = db.getItem(INGREDIENTS_KEY);
  assert.throws(() => recordIngredientCondition({ getItem: db.getItem, setItem: () => { throw new Error('quota'); } }, item.id, '싱싱해요'));
  assert.equal(db.getItem(INGREDIENTS_KEY), before);
  deleteIngredient(db, item.id);
  assert.throws(() => recordIngredientCondition(db, item.id, '싱싱해요'));
});

test('create, reload, update preserving identity, delete only selected ID', () => {
  const db = storage();
  assert.deepEqual(loadIngredients(db), []);
  const [first] = saveIngredient(db, draft);
  assert.equal(first.name, '시금치');
  saveIngredient(db, { ...draft, name: '두부' });
  assert.equal(loadIngredients(db).length, 2);
  const changed = saveIngredient(db, { ...draft, name: '수정', quantity: 0.5, unit: 'kg' }, first.id).find(item => item.id === first.id);
  assert.equal(changed.createdAt, first.createdAt);
  assert.equal(changed.quantity, 0.5);
  assert.equal(changed.unit, 'kg');
  assert.equal(deleteIngredient(db, first.id)[0].name, '두부');
  assert.equal(loadIngredients(db).length, 1);
});
test('reject invalid form values and invalid calendar dates', () => {
  for (const change of [{ name: ' ' }, { category: '' }, { storage: '' }, { quantity: 0 }, { quantity: Infinity }, { unit: '' }, { date: '2026-02-30' }, { date: 'invalid' }]) assert.ok(validateDraft({ ...draft, ...change }));
  assert.equal(validateDraft({ ...draft, date: '' }), null);
});
test('corrupted storage is not silently overwritten', () => {
  const db = storage();
  db.setItem(INGREDIENTS_KEY, '{broken');
  assert.throws(() => saveIngredient(db, draft));
  assert.equal(db.getItem(INGREDIENTS_KEY), '{broken');
});
test('quota failures propagate, leaving stored records unchanged', () => {
  const db = storage();
  saveIngredient(db, draft);
  const before = db.getItem(INGREDIENTS_KEY);
  assert.throws(() => saveIngredient({ getItem: db.getItem, setItem: () => { throw new Error('QuotaExceededError'); } }, draft));
  assert.equal(db.getItem(INGREDIENTS_KEY), before);
});
test('reads latest persisted records before writes; deleted edits do not recreate items', () => {
  const db = storage();
  const [first] = saveIngredient(db, draft);
  saveIngredient(db, { ...draft, name: '다른 탭' });
  assert.equal(saveIngredient(db, draft).length, 3);
  deleteIngredient(db, first.id);
  assert.throws(() => saveIngredient(db, draft, first.id), /삭제된 항목/);
  assert.equal(loadIngredients(db).length, 2);
});
