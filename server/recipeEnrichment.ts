import type { Recipe } from '../src/features/recipe/types';

export type BasicRecipe = { id: string; name: string; minutes: number | null; difficulty: string };
export const recipeNameKey = (name: string) => name.normalize('NFC').toLowerCase().replace(/계란/g, '달걀').replace(/쇠고기/g, '소고기').replace(/[\s\p{P}\p{S}]/gu, '');
export function parseMinutes(value: string): number | null {
  const hours = value.match(/^(\d+)\s*시간(?:\s*(\d+)\s*분)?$/);
  const minutes = hours ? Number(hours[1]) * 60 + Number(hours[2] ?? 0) : /^\d+\s*분$/.test(value) ? Number(value.replace(/\D/g, '')) : NaN;
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 1440 ? minutes : null;
}
export function normalizeDifficulty(value: string): string {
  if (['초보환영', '초급', '쉬움', '하'].includes(value)) return '초급';
  if (['보통', '중급', '중'].includes(value)) return '중급';
  if (['어려움', '고급', '상'].includes(value)) return '고급';
  return '';
}
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2; };
const methodTime: Record<string, number> = { 끓이기: 12, 찌기: 18, 볶기: 8, 굽기: 15, 튀기기: 15, 기타: 5 };
export function recipeFeatures(recipe: Recipe) {
  const steps = recipe.steps.length;
  const ingredients = Math.max(recipe.ingredients.length, (recipe.rawIngredients?.match(/\d+(?:\.\d+)?\s*(?:kg|g|ml|l|개|큰술|작은술|컵|모|장|쪽)(?=\b|[^a-z]|$)/gi) ?? []).length);
  const method = recipe.method || '기타';
  const handling = methodTime[method] ?? methodTime.기타;
  return { method, minutes: 5 + steps * 2 + ingredients + handling, complexity: steps + ingredients * .5 + (method === '튀기기' ? 4 : method === '굽기' ? 2 : 0) };
}

/** Match only unique exact normalized names; do not borrow values from merely similar dishes. */
export function enrichRecipes(recipes: Recipe[], basic: BasicRecipe[]): Recipe[] {
  const byName = new Map<string, BasicRecipe[]>();
  for (const row of basic) { const key = recipeNameKey(row.name); if (key) byName.set(key, [...(byName.get(key) ?? []), row]); }
  const foodCounts = new Map<string, number>();
  for (const recipe of recipes) { const key = recipeNameKey(recipe.name); foodCounts.set(key, (foodCounts.get(key) ?? 0) + 1); }
  const match = (recipe: Recipe) => {
    const key = recipeNameKey(recipe.name), candidates = byName.get(key);
    return foodCounts.get(key) === 1 && candidates?.length === 1 ? candidates[0] : undefined;
  };
  const paired = recipes.flatMap(recipe => {
    const row = match(recipe);
    return row ? [{ recipe, row, features: recipeFeatures(recipe) }] : [];
  });
  const timed = paired.filter(pair => pair.row.minutes !== null);
  const leveled = paired.filter(pair => !!pair.row.difficulty);
  const levels = ['초급', '중급', '고급'];
  const centers = levels.flatMap(label => {
    const values = leveled.filter(pair => pair.row.difficulty === label).map(pair => pair.features.complexity);
    return values.length >= 2 ? [{ label, value: median(values) }] : [];
  });
  // Calibrate only when label centers are ordered and at least two levels have examples.
  const learnedLevels = centers.length >= 2 && centers.every((center, i) => !i || center.value > centers[i - 1].value);
  // If label groups overlap (or only one is represented), retain ordinal thresholds
  // and calibrate a bounded global offset from the real labeled examples.
  const priorCenters: Record<string, number> = { 초급: 7, 중급: 14, 고급: 23 };
  const levelOffset = leveled.length >= 3 ? Math.max(-6, Math.min(6, median(leveled.map(pair => pair.features.complexity - priorCenters[pair.row.difficulty])))) : 0;
  return recipes.map(recipe => {
    const row = match(recipe), features = recipeFeatures(recipe);
    const sameMethod = timed.filter(pair => pair.features.method === features.method);
    const training = sameMethod.length >= 3 ? sameMethod : timed.length >= 3 ? timed : [];
    const factor = training.length ? Math.max(.25, Math.min(4, median(training.map(pair => pair.row.minutes! / pair.features.minutes)))) : 1;
    const minutes = row?.minutes ?? Math.max(5, Math.round(features.minutes * factor / 5) * 5);
    const adjustedComplexity = features.complexity - levelOffset;
    const difficulty = row?.difficulty || (learnedLevels ? centers.reduce((best, center) => Math.abs(center.value - features.complexity) < Math.abs(best.value - features.complexity) ? center : best).label : adjustedComplexity <= 10 ? '초급' : adjustedComplexity <= 18 ? '중급' : '고급');
    return { ...recipe, time: `약 ${minutes}분`, difficulty, metadata: {
      timeSource: row?.minutes ? 'mafra' as const : 'estimated' as const,
      difficultySource: row?.difficulty ? 'mafra' as const : 'estimated' as const,
      matchedRecipeId: row?.id, calibrationSamples: training.length,
      difficultyCalibrationSamples: learnedLevels || leveled.length >= 3 ? leveled.length : 0,
      estimateVersion: 'steps-ingredients-method-v1',
    } };
  });
}
