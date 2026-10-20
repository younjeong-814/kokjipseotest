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
const recipe = loadTs(new URL('../src/features/recipe/selectRecipeIngredients.ts', import.meta.url));
const make = (id, date) => ({ id, name: id, date, category: '채소', storage: '냉장', quantity: 1, unit: '개', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' });

test('레시피 칩은 D-3 이내와 기한경과 재료만 임박순으로 보여준다', () => {
  const today = new Date(2026, 9, 20);
  const items = [make('d4', '2026-10-24'), make('d3', '2026-10-23'), make('dday', '2026-10-20'), make('expired', '2026-10-18'), make('d1', '2026-10-21'), make('nodate', '')];
  const entries = recipe.selectRecipeIngredients(items, today);
  assert.deepEqual(entries.map(entry => [entry.item.id, entry.days]), [['expired', -2], ['dday', 0], ['d1', 1], ['d3', 3]]);
  assert.deepEqual(recipe.defaultRecipeSelection(entries), ['dday', 'd1', 'd3']);
});
