import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/ingredients/repository.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { INGREDIENTS_KEY, loadIngredients, saveIngredient, deleteIngredient, validateDraft } = exports;
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const draft = { name: ' 시금치 ', category: '채소', storage: '냉장', quantity: 2, unit: '봉', date: '2026-10-20' };

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
