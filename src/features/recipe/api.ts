import { requestExternal } from '../cloud/externalRequests';
import type { RecipeSearchResult } from './types';

/** Integration point for the ingredient selection and recipe detail screens. */
export async function searchRecipes(ingredients: readonly string[], page = 1, signal?: AbortSignal): Promise<RecipeSearchResult> {
  const params = new URLSearchParams({ page: String(page) });
  ingredients.forEach(name => params.append('ingredient', name));
  const response = await requestExternal('recipes',`${import.meta.env.VITE_RECIPE_ENDPOINT || '/api/recipes'}?${params}`, { signal });
  let data: RecipeSearchResult & { error?: string; mode?:string };
  try { data = await response.json(); }
  catch { throw new Error('레시피 검색 서버 응답을 확인할 수 없어요. 서버 연결을 확인해 주세요.'); }
  if(data.mode==='mock')throw new Error('레시피는 모의 연결 상태예요. 실제 API 서버 설정이 필요해요.');
  if (!response.ok) throw new Error(data.error || '레시피 검색에 실패했어요. 다시 시도해 주세요.');
  if (!Array.isArray(data.recipes) || !Number.isInteger(data.total) || data.total < 0 || data.page !== page || data.pageSize !== 30) throw new Error('레시피 검색 응답 형식이 올바르지 않아요.');
  return data;
}
