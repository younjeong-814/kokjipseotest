import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Recipe, RecipeSearchResult } from '../src/features/recipe/types';

// 농림수산식품교육문화정보원 레시피 Open API (2018년부터 IP 주소로 제공, HTTP만 지원)
const API = 'http://211.237.50.150:7080/openapi';
export const GRIDS = {
  basic: 'Grid_20150827000000000226_1', // 레시피 기본정보
  ingredients: 'Grid_20150827000000000227_1', // 레시피 재료정보
  steps: 'Grid_20150827000000000228_1', // 레시피 과정정보
} as const;
const PAGE = 1000; // 요청당 최대 1,000건
const MAX_ROWS = 50000;
const CACHE_MS = 12 * 60 * 60 * 1000; // 2015년 이후 갱신이 거의 없는 정적 데이터

type Row = Record<string, unknown>;
const text = (value: unknown) => typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
const normalize = (value: string) => value.normalize('NFC').toLowerCase().replace(/\s+/g, '');
export const canonical = (value: string) => normalize(value).replace(/계란/g, '달걀');

function imageUrl(value: unknown): string {
  try {
    const url = new URL(text(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch { return ''; }
}

export class RecipeApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** 한 Grid 응답 페이지를 검사하고 row 배열과 전체 건수를 돌려준다. */
export function parseGridPage(data: unknown, grid: string): { rows: Row[]; total: number } {
  if (!data || typeof data !== 'object') throw new RecipeApiError(502, '레시피 응답을 읽을 수 없어요. 다시 시도해 주세요.');
  const root = data as Row;
  const service = (root[grid] ?? root) as Row;
  const result = (service.result ?? service.RESULT ?? root.result ?? root.RESULT) as Row | undefined;
  const code = text(result?.code ?? result?.CODE);
  if (code === 'INFO-200') return { rows: [], total: 0 };
  if (code === 'INFO-100' || code === 'ERROR-310') throw new RecipeApiError(502, '농림수산식품교육문화정보원 인증키를 확인해 주세요.');
  if (code === 'ERROR-350') throw new RecipeApiError(503, '레시피 API 일일 호출 한도에 도달했어요. 잠시 후 다시 시도해 주세요.');
  if (code !== 'INFO-000') throw new RecipeApiError(502, '레시피 정보를 불러오지 못했어요. 다시 시도해 주세요.');
  const total = Number(service.totalCnt);
  if (!Number.isInteger(total) || total < 0 || (total > 0 && !Array.isArray(service.row))) throw new RecipeApiError(502, '레시피 응답 형식이 올바르지 않아요.');
  const rows = Array.isArray(service.row) ? service.row : [];
  if (rows.some(row => !row || typeof row !== 'object')) throw new RecipeApiError(502, '레시피 응답 형식이 올바르지 않아요.');
  return { rows: rows as Row[], total };
}

/** 기본·재료·과정 정보를 RECIPE_ID로 합친다. 재료가 없는 레시피는 검색할 수 없으므로 제외한다. */
export function buildRecipes(basic: Row[], ingredientRows: Row[], stepRows: Row[]): Recipe[] {
  const group = (rows: Row[]) => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const id = text(row.RECIPE_ID);
      if (!id) continue;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(row);
    }
    return map;
  };
  const ingredients = group(ingredientRows), steps = group(stepRows);
  const order = (key: string) => (a: Row, b: Row) => Number(a[key]) - Number(b[key]);
  const seen = new Set<string>();
  return basic.flatMap(row => {
    const id = text(row.RECIPE_ID), name = text(row.RECIPE_NM_KO);
    if (!id || !name || seen.has(id)) return [];
    const parts = (ingredients.get(id) ?? []).sort(order('IRDNT_SN')).map(item => ({ name: text(item.IRDNT_NM), amount: text(item.IRDNT_CPCTY), type: text(item.IRDNT_TY_NM) })).filter(item => item.name);
    if (!parts.length) return [];
    seen.add(id);
    return [{
      id, name, summary: text(row.SUMRY), category: text(row.TY_NM) || text(row.NATION_NM),
      image: imageUrl(row.IMG_URL), calories: text(row.CALORIE),
      time: text(row.COOKING_TIME), difficulty: text(row.LEVEL_NM), servings: text(row.QNT),
      ingredients: parts,
      steps: (steps.get(id) ?? []).sort(order('COOKING_NO')).flatMap(step => {
        const instruction = text(step.COOKING_DC);
        return instruction ? [{ text: instruction, image: imageUrl(step.STRE_STEP_IMAGE_URL), tip: text(step.STEP_TIP) }] : [];
      }),
    }];
  });
}

export function createRecipeSearch(apiKey: string | undefined, fetcher: typeof fetch = fetch) {
  let cache: { expires: number; recipes: Recipe[] } | null = null;
  let pending: Promise<Recipe[]> | null = null;

  async function fetchGrid(grid: string): Promise<Row[]> {
    const rows: Row[] = [];
    for (let start = 1; start <= MAX_ROWS; start += PAGE) {
      const response = await fetcher(`${API}/${encodeURIComponent(apiKey!)}/json/${grid}/${start}/${start + PAGE - 1}`, { signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (!response.ok) throw new RecipeApiError(502, '레시피 API 서버에 연결하지 못했어요.');
      const page = parseGridPage(await response.json(), grid);
      rows.push(...page.rows);
      if (page.total > MAX_ROWS) throw new RecipeApiError(502, '레시피 데이터가 예상보다 많아요. 서버 설정을 확인해 주세요.');
      if (start + PAGE - 1 >= page.total) break;
      if (!page.rows.length) throw new RecipeApiError(502, '레시피 목록을 끝까지 불러오지 못했어요. 다시 시도해 주세요.');
    }
    return rows;
  }

  // 전체 데이터가 약 500여 건이라 세 Grid를 한 번에 받아 서버에서 조인·검색한다.
  async function dataset(): Promise<Recipe[]> {
    if (cache && cache.expires > Date.now()) return cache.recipes;
    if (pending) return pending;
    pending = (async () => {
      const [basic, ingredients, steps] = await Promise.all([fetchGrid(GRIDS.basic), fetchGrid(GRIDS.ingredients), fetchGrid(GRIDS.steps)]);
      const recipes = buildRecipes(basic, ingredients, steps);
      cache = { recipes, expires: Date.now() + CACHE_MS };
      return recipes;
    })();
    try { return await pending; } finally { pending = null; }
  }

  return async (names: string[], page = 1): Promise<RecipeSearchResult> => {
    if (!names.length || names.length > 10 || names.some(name => typeof name !== 'string' || !name.trim() || name.length > 60 || /[\u0000-\u001f]/.test(name)) || !Number.isInteger(page) || page < 1 || page > 500) throw new RecipeApiError(400, '재료를 1~10개 선택하고 올바른 페이지를 요청해 주세요.');
    if (!apiKey?.trim()) throw new RecipeApiError(503, '레시피 검색 준비 중이에요. 서버의 FOOD_API_KEY 설정을 확인해 주세요.');
    const selected = [...new Set(names.map(name => canonical(name)))];
    const scored = (await dataset()).flatMap(recipe => {
      const parts = recipe.ingredients.map(item => ({ key: canonical(item.name), main: item.type === '주재료' }));
      const hits = selected.map(name => parts.find(part => part.key.includes(name)));
      if (hits.some(hit => !hit)) return [];
      return [{ recipe, main: hits.filter(hit => hit!.main).length }];
    });
    // 선택 재료가 주재료로 쓰이는 레시피를 먼저 보여준다.
    scored.sort((a, b) => b.main - a.main);
    const pageSize = 20;
    return { recipes: scored.slice((page - 1) * pageSize, page * pageSize).map(item => item.recipe), total: scored.length, page, pageSize };
  };
}

export function recipesMiddleware(apiKey: string | undefined) {
  const search = createRecipeSearch(apiKey);
  return async (req: IncomingMessage, res: ServerResponse) => {
    const send = (status: number, body: object) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(405, { error: 'GET만 지원해요.' }); }
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const ingredients = url.searchParams.getAll('ingredient');
      const page = Number(url.searchParams.get('page') ?? '1');
      send(200, await search(ingredients, page));
    } catch (error) {
      // Never return or log upstream URLs: they contain the secret key.
      if (error instanceof RecipeApiError) return send(error.status, { error: error.message });
      send(502, { error: '레시피 검색 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' });
    }
  };
}
