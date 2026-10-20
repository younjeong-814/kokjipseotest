import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(path, replacements = []) {
  let source = readFileSync(new URL(path, import.meta.url), 'utf8');
  for (const [from, to] of replacements) source = source.replace(from, to);
  const exports = {};
  new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
  return exports;
}
const { createRecipeSearch, parseGridPage, buildRecipes, recipesMiddleware, GRIDS } = load('../server/recipes.ts');
const { searchRecipes } = load('../src/features/recipe/api.ts', [["import.meta.env.VITE_RECIPE_ENDPOINT || '/api/recipes'", "'/api/recipes'"]]);

const basic = id => ({ RECIPE_ID: id, RECIPE_NM_KO: `레시피 ${id}`, SUMRY: '요약', TY_NM: '밥', COOKING_TIME: '15분', LEVEL_NM: '초보환영', QNT: '2인분', CALORIE: '300Kcal', IMG_URL: 'http://file.okdab.kr/recipe/1.jpg' });
const ingredient = (id, name, sn = 1, type = '주재료', amount = '1개') => ({ RECIPE_ID: id, IRDNT_SN: sn, IRDNT_NM: name, IRDNT_CPCTY: amount, IRDNT_TY_NM: type });
const step = (id, no, text) => ({ RECIPE_ID: id, COOKING_NO: no, COOKING_DC: text, STEP_TIP: '' });
const payload = (grid, rows, total = rows.length) => ({ [grid]: { totalCnt: total, startRow: 1, endRow: rows.length, result: { code: 'INFO-000', message: '정상 처리되었습니다.' }, row: rows } });
const response = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
function upstream({ basics, ingredients, steps = [] }, calls = []) {
  return async (url, options) => {
    calls.push(url);
    assert.ok(options.signal instanceof AbortSignal);
    if (url.includes(GRIDS.basic)) return response(payload(GRIDS.basic, basics));
    if (url.includes(GRIDS.ingredients)) return response(payload(GRIDS.ingredients, ingredients));
    return response(payload(GRIDS.steps, steps));
  };
}

test('joins basic, ingredient and step grids by RECIPE_ID with time, difficulty and servings', () => {
  const [recipe] = buildRecipes([basic(1), basic(2)], [ingredient(1, '두부', 2, '부재료', '100g'), ingredient(1, '대파', 1)], [step(1, 2, '끓인다.'), step(1, 1, '썬다.')]);
  assert.equal(recipe.name, '레시피 1');
  assert.equal(recipe.time, '15분');
  assert.equal(recipe.difficulty, '초보환영');
  assert.equal(recipe.servings, '2인분');
  assert.deepEqual(recipe.ingredients.map(item => item.name), ['대파', '두부']);
  assert.equal(recipe.ingredients[1].amount, '100g');
  assert.deepEqual(recipe.steps.map(item => item.text), ['썬다.', '끓인다.']);
  assert.equal(buildRecipes([{ ...basic(3), IMG_URL: 'javascript:alert(1)' }], [ingredient(3, '쌀')], [])[0].image, '');
});

test('AND search, main-ingredient ordering, paging and dataset cache', async () => {
  const calls = [];
  const ids = Array.from({ length: 25 }, (_, i) => String(i + 1));
  const search = createRecipeSearch('test-only-key', upstream({
    basics: [...ids.map(basic), basic('other')],
    ingredients: [...ids.flatMap(id => [ingredient(id, '대파', 1, id === '25' ? '주재료' : '부재료'), ingredient(id, '두부 ', 2)]), ingredient('other', '양파')],
  }, calls));
  const result = await search(['대파', '두부']);
  assert.equal(result.total, 25);
  assert.equal(result.recipes.length, 20);
  assert.equal(result.recipes[0].id, '25');
  assert.equal((await search(['대파', '두부'], 2)).recipes.length, 5);
  assert.equal((await search(['대파', '없는재료'])).total, 0);
  assert.equal(calls.length, 3);
});

test('fetches every upstream page of a grid', async () => {
  const calls = [];
  const search = createRecipeSearch('test-only-key', async url => {
    calls.push(url);
    if (url.includes(GRIDS.basic)) return response(payload(GRIDS.basic, [basic(1), basic(1001)]));
    if (url.includes(GRIDS.ingredients)) return response(url.includes('/1/1000') ? payload(GRIDS.ingredients, Array.from({ length: 1000 }, (_, i) => ingredient(1, `재료${i}`, i)), 1001) : payload(GRIDS.ingredients, [ingredient(1001, '대파')], 1001));
    return response(payload(GRIDS.steps, []));
  });
  assert.equal((await search(['대파'])).total, 1);
  assert.equal(calls.filter(url => url.includes(GRIDS.ingredients)).length, 2);
});

test('empty results differ from auth, quota and malformed errors', async () => {
  assert.deepEqual(parseGridPage({ result: { code: 'INFO-200' } }, GRIDS.basic), { rows: [], total: 0 });
  for (const code of ['INFO-100', 'ERROR-310', 'ERROR-350', 'ERROR-500', 'ERROR-336']) {
    assert.throws(() => parseGridPage({ result: { code } }, GRIDS.basic));
  }
  assert.throws(() => parseGridPage({}, GRIDS.basic));
  const malformed = payload(GRIDS.basic, [], 1);
  delete malformed[GRIDS.basic].row;
  assert.throws(() => parseGridPage(malformed, GRIDS.basic));
  const search = createRecipeSearch('test-only-key', async () => response({ result: { code: 'INFO-200' } }));
  assert.equal((await search(['대파'])).total, 0);
});

test('validates input before external calls and missing keys are actionable', async () => {
  const search = createRecipeSearch(undefined, () => { throw new Error('must not fetch'); });
  for (const ingredients of [[], [''], Array(11).fill('대파'), ['a'.repeat(61)], ['\n']]) await assert.rejects(search(ingredients), { status: 400 });
  await assert.rejects(search(['대파'], 0), { status: 400 });
  await assert.rejects(search(['대파'], 1.5), { status: 400 });
  await assert.rejects(search(['대파']), { status: 503 });
});

test('egg aliases match both spellings', async () => {
  const search = createRecipeSearch('test-only-key', upstream({ basics: [basic(1), basic(2)], ingredients: [ingredient(1, '달걀'), ingredient(2, '계란')] }));
  assert.equal((await search(['계란'])).total, 2);
  assert.equal((await search(['달걀'])).total, 2);
});

test('simultaneous requests share upstream work; failures can retry', async () => {
  const calls = [];
  const search = createRecipeSearch('test-only-key', upstream({ basics: [basic(1)], ingredients: [ingredient(1, '대파')] }, calls));
  await Promise.all([search(['대파']), search(['두부'])]);
  assert.equal(calls.length, 3);
  let attempt = 0;
  const ok = upstream({ basics: [basic(1)], ingredients: [ingredient(1, '대파')] });
  const retry = createRecipeSearch('test-only-key', async (url, options) => { if (++attempt === 1) throw new Error('network'); return ok(url, options); });
  await assert.rejects(retry(['대파']));
  assert.equal((await retry(['대파'])).total, 1);
});

test('HTTP middleware returns JSON errors without leaking credentials or request URLs', async () => {
  const middleware = recipesMiddleware(undefined);
  let body, status;
  const res = { setHeader() {}, set statusCode(value) { status = value; }, end(value) { body = JSON.parse(value); } };
  await middleware({ method: 'GET', url: '/?ingredient=대파' }, res);
  assert.equal(status, 503);
  assert.match(body.error, /MAFRA_API_KEY/);
  await middleware({ method: 'POST', url: '/' }, res);
  assert.equal(status, 405);
});

test('client passes selected ingredients and abort signal; empty and error responses are distinct', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    const params = new URL(url, 'http://localhost').searchParams;
    assert.deepEqual(params.getAll('ingredient'), ['대파', '두부']);
    assert.equal(options.signal, controller.signal);
    return response({ recipes: [], total: 0, page: 1, pageSize: 20 });
  };
  assert.equal((await searchRecipes(['대파', '두부'], 1, controller.signal)).total, 0);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: '연결 실패' }), { status: 502 });
  await assert.rejects(searchRecipes(['대파']), /연결 실패/);
  globalThis.fetch = async () => new Response('<html>Not an API</html>');
  await assert.rejects(searchRecipes(['대파']), /서버 응답/);
});
