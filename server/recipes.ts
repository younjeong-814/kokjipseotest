import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Recipe, RecipeSearchResult } from '../src/features/recipe/types';

const API = 'https://openapi.foodsafetykorea.go.kr/api';
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const normalize = (value: string) => value.normalize('NFC').toLowerCase().replace(/\s+/g, '');
const aliases: Record<string, string> = { 계란: '달걀' };
const canonical = (value: string) => normalize(value).replace(/계란/g, '달걀');
function imageUrl(value: unknown): string {
  try {
    const url = new URL(text(value));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (url.hostname.endsWith('.foodsafetykorea.go.kr')) url.protocol = 'https:';
    return url.toString();
  } catch { return ''; }
}

export function normalizeRecipe(row: Record<string, unknown>): Recipe | null {
  const id = text(row.RCP_SEQ), name = text(row.RCP_NM), ingredients = text(row.RCP_PARTS_DTLS);
  if (!id || !name || !ingredients) return null;
  return {
    id, name, ingredients, image: imageUrl(row.ATT_FILE_NO_MAIN || row.ATT_FILE_NO_MK),
    method: text(row.RCP_WAY2), category: text(row.RCP_PAT2), calories: text(row.INFO_ENG),
    nutrition: { carbohydrate: text(row.INFO_CAR), protein: text(row.INFO_PRO), fat: text(row.INFO_FAT), sodium: text(row.INFO_NA) },
    steps: Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, '0')).flatMap(index => {
      const instruction = text(row[`MANUAL${index}`]);
      return instruction ? [{ text: instruction, image: imageUrl(row[`MANUAL_IMG${index}`]) }] : [];
    }),
  };
}

export class RecipeApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function parseRecipePage(data: unknown): { recipes: Recipe[]; total: number } {
  if (!data || typeof data !== 'object') throw new RecipeApiError(502, '레시피 응답을 읽을 수 없어요. 다시 시도해 주세요.');
  const root = data as Record<string, unknown>;
  const service = (root.COOKRCP01 ?? root) as Record<string, unknown>;
  const code = text((service.RESULT as Record<string, unknown> | undefined)?.CODE);
  if (code === 'INFO-200') return { recipes: [], total: 0 };
  if (['INFO-100', 'INFO-110', 'INFO-120', 'INFO-400', 'INFO-600'].includes(code)) throw new RecipeApiError(502, '식품안전나라 인증키와 COOKRCP01 서비스 이용 승인을 확인해 주세요.');
  if (code === 'INFO-300' || code === 'INFO-320' || code === 'ERROR-503') throw new RecipeApiError(503, '식품안전나라 호출 한도에 도달했어요. 잠시 후 다시 시도해 주세요.');
  if (code !== 'INFO-000') throw new RecipeApiError(502, '식품안전나라에서 레시피를 불러오지 못했어요. 다시 시도해 주세요.');
  const total = Number(service.total_count);
  if (!Number.isInteger(total) || total < 0 || (total > 0 && !Array.isArray(service.row))) throw new RecipeApiError(502, '레시피 응답 형식이 올바르지 않아요.');
  const rows = Array.isArray(service.row) ? service.row : [];
  const recipes = rows.flatMap((row: unknown) => {
    if (!row || typeof row !== 'object') throw new RecipeApiError(502, '레시피 응답 형식이 올바르지 않아요.');
    const recipe = normalizeRecipe(row as Record<string, unknown>);
    if (!recipe) throw new RecipeApiError(502, '레시피 응답에 필요한 정보가 없어요.');
    return [recipe];
  });
  return { recipes, total };
}

export function createRecipeSearch(apiKey: string | undefined, fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { expires: number; recipes: Recipe[] }>();
  const pending = new Map<string, Promise<Recipe[]>>();
  async function candidates(seed: string) {
    const cached = cache.get(seed);
    if (cached && cached.expires > Date.now()) return cached.recipes;
    const existing = pending.get(seed);
    if (existing) return existing;
    const request = (async () => {
      const signal = AbortSignal.timeout(15000);
      const collected = new Map<string, Recipe>();
      // Fetch every upstream page before applying AND, avoiding false empty results.
      for (let start = 1; start <= 10000; start += 1000) {
        const response = await fetcher(`${API}/${encodeURIComponent(apiKey!)}/COOKRCP01/json/${start}/${start + 999}/RCP_PARTS_DTLS=${encodeURIComponent(seed)}`, { signal, redirect: 'error' });
        if (!response.ok) throw new RecipeApiError(502, '식품안전나라 서버에 연결하지 못했어요.');
        const result = parseRecipePage(await response.json());
        for (const recipe of result.recipes) collected.set(recipe.id, recipe);
        if (result.total > 10000) throw new RecipeApiError(502, '검색 범위가 너무 넓어요. 더 구체적인 재료를 선택해 주세요.');
        if (start + 999 >= result.total) break;
        if (!result.recipes.length) throw new RecipeApiError(502, '레시피 목록을 끝까지 불러오지 못했어요. 다시 시도해 주세요.');
      }
      const recipes = [...collected.values()];
      if (cache.size >= 20) cache.delete(cache.keys().next().value!);
      cache.set(seed, { recipes, expires: Date.now() + 5 * 60 * 1000 });
      return recipes;
    })();
    pending.set(seed, request);
    try { return await request; } finally { pending.delete(seed); }
  }
  return async (ingredients: string[], page = 1): Promise<RecipeSearchResult> => {
    if (!ingredients.length || ingredients.length > 10 || ingredients.some(name => typeof name !== 'string' || !name.trim() || name.length > 60 || /[\u0000-\u001f]/.test(name)) || !Number.isInteger(page) || page < 1 || page > 500) throw new RecipeApiError(400, '재료를 1~10개 선택하고 올바른 페이지를 요청해 주세요.');
    if (!apiKey?.trim()) throw new RecipeApiError(503, '레시피 검색 준비 중이에요. 서버의 FOOD_SAFETY_API_KEY 설정을 확인해 주세요.');
    const selected = [...new Set(ingredients.map(name => name.trim()))];
    // Seed without synonyms; query each documented alias to avoid missing egg recipes.
    const seed = selected[0];
    const seeds = [seed, aliases[seed], ...(seed === '달걀' ? ['계란'] : [])].filter((value): value is string => !!value);
    const all = new Map<string, Recipe>();
    for (const keyword of seeds) for (const recipe of await candidates(keyword)) all.set(recipe.id, recipe);
    const matches = [...all.values()].filter(recipe => selected.every(name => canonical(recipe.ingredients).includes(canonical(name))));
    const pageSize = 20;
    return { recipes: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageSize };
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
