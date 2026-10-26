import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/features/recipe/apiPresentation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
const ingredientSource = readFileSync(new URL('../src/features/recipe/ingredientText.ts', import.meta.url), 'utf8');
const ingredientExports = {};
new Function('exports', ts.transpileModule(ingredientSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(ingredientExports);
new Function('exports', 'require', compiled)(exports, name => name.endsWith('ingredientText') ? ingredientExports : { asset: name => `/assets/${name}` });
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
test('detail and result hashtags share heading removal for cached recipe entries', () => {
  const dirty = { ...recipe, ingredients: [{ name: '재료 느타리버섯', amount: '10g', type: '' }, { name: '두부', amount: '50g', type: '' }] };
  assert.deepEqual(exports.toRecipeSummary(dirty, ['두부']).tags, ['두부', '느타리버섯']);
  assert.deepEqual(exports.toRecipeDetail(dirty).ingredients.map(item => item.name), ['느타리버섯', '두부']);
});
test('detail steps drop source numbering because the list renders its own badge', () => {
  const numbered = { ...recipe, steps: ['1. 토마토를 썬다.', '2)달걀을 푼다.', '③ 볶는다.', '(4) 담는다.', '1.5컵의 물을 붓는다.', '10. 마무리한다.', '1.'].map(text => ({ text, image: '', tip: '' })) };
  assert.deepEqual(exports.toRecipeDetail(numbered).steps, ['토마토를 썬다.', '달걀을 푼다.', '볶는다.', '담는다.', '1.5컵의 물을 붓는다.', '마무리한다.']);
});
test('detail groups sauce rows from the source text after plain ingredients', () => {
  const raw = '[2인분] 참기름 1g, 애호박 20g [소스소개] 쇠고기양념:설탕 1.4g, 간장 2g\n저나트륨겨자간장소스 :간장 2g, 식초 3g';
  const detail = exports.toRecipeDetail({ ...recipe, rawIngredients: raw, ingredients: [{ name: '애호박', amount: '20g [소스소개] 쇠고기양념:설탕 1.4g', type: '' }] });
  assert.deepEqual(detail.ingredients.map(item => [item.name, item.amount, item.group]), [
    ['참기름', '1g', undefined], ['애호박', '20g', undefined],
    ['설탕', '1.4g', '쇠고기양념'], ['간장', '2g', '쇠고기양념'],
    ['간장', '2g', '저나트륨겨자간장소스'], ['식초', '3g', '저나트륨겨자간장소스'],
  ]);
  assert.deepEqual(exports.toRecipeDetail(recipe).ingredients.map(item => item.group), [undefined, undefined, undefined, undefined]);
});
