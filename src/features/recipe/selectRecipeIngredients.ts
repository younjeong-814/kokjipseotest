import type { Ingredient } from '../ingredients/repository';
import { HOME_URGENT_DAYS } from '../home/selectHomeIngredients';

/** 냉장고 카드가 D-n 배지를 강조하는 기준(D-3)과 같다. 기한이 지난 재료(D+n)도 포함한다. */
export const RECIPE_URGENT_DAYS = HOME_URGENT_DAYS;
export type RecipeIngredient = { item: Ingredient; days: number };

const daysUntil = (date: string, todayUtc: number): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) return null;
  return Math.round((time - todayUtc) / 86400000);
};

/** 레시피 칩: 소비기한이 D-3 이내이거나 지난 식재료를 임박한 순으로. 음식(isFood)은 호출하는 쪽에서 뺀다. */
export function selectRecipeIngredients(items: Ingredient[], today: Date): RecipeIngredient[] {
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return items
    .map(item => ({ item, days: daysUntil(item.date, todayUtc) }))
    .filter((entry): entry is RecipeIngredient => entry.days !== null && entry.days <= RECIPE_URGENT_DAYS)
    .sort((a, b) => a.days - b.days || a.item.name.localeCompare(b.item.name, 'ko') || a.item.id.localeCompare(b.item.id));
}

/** 처음엔 D-DAY ~ D-3 재료를 선택해 둔다. 기한이 지난 재료는 상태를 확인한 뒤 직접 고르도록 비워 둔다. */
export const defaultRecipeSelection = (entries: RecipeIngredient[]) => entries.filter(entry => entry.days >= 0).map(entry => entry.item.id);
