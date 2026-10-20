import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/recipe/apiPresentation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function('exports', 'require', compiled)(exports, () => ({ asset: name => `/assets/${name}` }));
const recipe = {
  id: '42', name: '토마토 달걀볶음', summary: '', category: '볶음', image: 'https://example.com/recipe.png', calories: '200Kcal',
  time: '15분', difficulty: '초보환영', servings: '1인분',
  ingredients: [{ name: '토마토', amount: '1개', type: '주재료' }, { name: '소금', amount: '1g', type: '양념' }, { name: '달걀', amount: '2개', type: '주재료' }, { name: '우유', amount: '50ml', type: '부재료' }],
  steps: [{ text: '재료를 볶아요.', image: '', tip: '' }],
};
test('detail keeps real time, difficulty, servings, ingredient amounts and steps', () => {
  const detail = exports.toRecipeDetail(recipe);
  assert.equal(detail.id, '42');
  assert.equal(detail.time, '약 15분');
  assert.equal(detail.difficulty, '초보환영');
  assert.equal(detail.servings, '1인분');
  assert.deepEqual(detail.ingredients.map(item => [item.name, item.amount]), [['토마토', '1개'], ['소금', '1g'], ['달걀', '2개'], ['우유', '50ml']]);
  assert.deepEqual(detail.steps, ['재료를 볶아요.']);
  assert.equal(exports.toRecipeDetail({ ...recipe, image: '', time: '' }).imageUrl, '/assets/recipe-empty.png');
  assert.equal(exports.toRecipeDetail({ ...recipe, time: '' }).time, undefined);
  assert.equal(exports.toRecipeDetail({ ...recipe, time: '약 20분' }).time, '약 20분');
  assert.equal(exports.toRecipeSummary({ ...recipe, time: '약 20분' }, []).time, '약 20분');
});
test('summary tags selected ingredients plus one unselected main ingredient', () => {
  const summary = exports.toRecipeSummary(recipe, ['우유', '토마토']);
  assert.equal(summary.time, '약 15분');
  assert.equal(summary.difficulty, '초보환영');
  assert.deepEqual(summary.tags, ['우유', '토마토', '달걀']);
  assert.deepEqual(exports.toRecipeSummary(recipe, ['계란', '토마토']).tags, ['계란', '토마토', '우유']);
});
