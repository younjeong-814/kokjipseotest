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
const { createRecipeSearch, parseRecipePage, normalizeRecipe, recipesMiddleware } = load('../server/recipes.ts');
const { searchRecipes } = load('../src/features/recipe/api.ts', [["import.meta.env.VITE_RECIPE_ENDPOINT || '/api/recipes'", "'/api/recipes'"]]);
const row = (id, ingredients = '대파 10g, 두부 100g') => ({ RCP_SEQ: String(id), RCP_NM: `레시피 ${id}`, RCP_PARTS_DTLS: ingredients, RCP_WAY2: '끓이기', RCP_PAT2: '반찬', INFO_ENG: '120', ATT_FILE_NO_MAIN: 'http://www.foodsafetykorea.go.kr/uploadimg/cook/example.png', MANUAL01: '재료를 준비한다.', MANUAL_IMG01: 'https://www.foodsafetykorea.go.kr/uploadimg/cook/step.png' });
const payload = (rows, total = rows.length) => ({ COOKRCP01: { RESULT: { CODE: 'INFO-000' }, total_count: String(total), row: rows } });
const response = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

test('maps official fields and preserves details for the next screen', () => {
  const recipe = normalizeRecipe({ ...row(1), INFO_PRO: '10', INFO_NA: '200' });
  assert.equal(recipe.name, '레시피 1');
  assert.equal(recipe.image.startsWith('https://'), true);
  assert.equal(recipe.nutrition.protein, '10');
  assert.equal(recipe.steps.length, 1);
  assert.equal(normalizeRecipe({ ...row(1), ATT_FILE_NO_MAIN: 'javascript:alert(1)' }).image, '');
});

test('AND search, encoded seed, duplicates, paging and cache use official response', async () => {
  const calls = [];
  const search = createRecipeSearch('test-only-key', async (url, options) => {
    calls.push(url);
    assert.ok(options.signal instanceof AbortSignal);
    return response(payload([...Array.from({ length: 25 }, (_, i) => row(i)), row(0), row('other', '양파 10g')]));
  });
  const result = await search(['대파', '두부']);
  assert.equal(result.total, 25);
  assert.equal(result.recipes.length, 20);
  assert.ok(calls[0].endsWith(`RCP_PARTS_DTLS=${encodeURIComponent('대파')}`));
  const second = await search(['대파', '두부'], 2);
  assert.equal(second.recipes.length, 5);
  assert.equal(calls.length, 1);
  assert.equal((await search(['대파', '없는재료'])).total, 0);
});

test('fetches all upstream pages before declaring no matches', async () => {
  let calls = 0;
  const search = createRecipeSearch('test-only-key', async url => {
    calls++;
    return response(url.includes('/1/1000/') ? payload(Array.from({ length: 1000 }, (_, i) => row(i, '대파')), 1001) : payload([row(1001)], 1001));
  });
  assert.equal((await search(['대파', '두부'])).total, 1);
  assert.equal(calls, 2);
});

test('empty results differ from auth, quota and malformed errors', async () => {
  assert.deepEqual(parseRecipePage({ RESULT: { CODE: 'INFO-200' } }), { recipes: [], total: 0 });
  for (const code of ['INFO-100', 'INFO-110', 'INFO-600', 'INFO-300', 'INFO-320', 'ERROR-503', 'ERROR-500']) {
    assert.throws(() => parseRecipePage({ RESULT: { CODE: code } }));
  }
  assert.throws(() => parseRecipePage({}));
  const malformed = payload([], 1);
  delete malformed.COOKRCP01.row;
  assert.throws(() => parseRecipePage(malformed));
  const search = createRecipeSearch('test-only-key', async () => response({ RESULT: { CODE: 'INFO-200' } }));
  assert.equal((await search(['대파'])).total, 0);
});

test('validates input before external calls and missing keys are actionable', async () => {
  const search = createRecipeSearch(undefined, () => { throw new Error('must not fetch'); });
  for (const ingredients of [[], [''], Array(11).fill('대파'), ['a'.repeat(61)], ['\n']]) await assert.rejects(search(ingredients), { status: 400 });
  await assert.rejects(search(['대파'], 0), { status: 400 });
  await assert.rejects(search(['대파'], 1.5), { status: 400 });
  await assert.rejects(search(['대파']), { status: 503 });
});

test('egg aliases query both spellings and deduplicate recipes', async () => {
  let calls = 0;
  const search = createRecipeSearch('test-only-key', async () => { calls++; return response(payload([row(1, '달걀 1개'), row(2, '계란 1개')])); });
  assert.equal((await search(['계란'])).total, 2);
  assert.equal(calls, 2);
});

test('simultaneous identical requests share upstream work; failures can retry', async () => {
  let calls = 0;
  const search = createRecipeSearch('test-only-key', async () => { calls++; return response(payload([row(1)])); });
  await Promise.all([search(['대파']), search(['대파'])]);
  assert.equal(calls, 1);
  let attempt = 0;
  const retry = createRecipeSearch('test-only-key', async () => { if (++attempt === 1) throw new Error('network'); return response(payload([row(1)])); });
  await assert.rejects(retry(['대파']));
  assert.equal((await retry(['대파'])).total, 1);
});

test('HTTP middleware returns JSON errors without leaking credentials or request URLs', async () => {
  const middleware = recipesMiddleware(undefined);
  let body, status;
  const res = { setHeader() {}, set statusCode(value) { status = value; }, end(value) { body = JSON.parse(value); } };
  await middleware({ method: 'GET', url: '/?ingredient=대파' }, res);
  assert.equal(status, 503);
  assert.match(body.error, /FOOD_SAFETY_API_KEY/);
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
