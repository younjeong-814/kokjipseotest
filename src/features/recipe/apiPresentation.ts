import { asset } from '../../lib/assets';
import type { Recipe, RecipeDetail, RecipeSummary } from './types';
import { cleanIngredientParts } from './ingredientText';

const key = (value: string) => value.normalize('NFC').toLowerCase().replace(/\s+/g, '').replace(/계란/g, '달걀');
const optional = (value: string) => value || undefined;
export const approximateTime = (value: string) => value ? `약 ${value.replace(/^(?:약\s*)+/, '')}` : undefined;

// 태그: 레시피에 들어가는 선택 재료 + 선택하지 않은 재료 1개(주재료 > 부재료 > 양념 순)
export function toRecipeSummary(recipe: Recipe, selectedNames: readonly string[]): RecipeSummary {
  const parts = recipe.ingredients.map(item => ({ ...item, ...cleanIngredientParts(item.name, item.amount) })).filter(item => item.name).map(item => ({ ...item, key: key(item.name) }));
  const selected = selectedNames.filter(name => parts.some(part => part.key.includes(key(name))));
  const isSelected = (part: { key: string }) => selectedNames.some(name => part.key.includes(key(name)));
  const candidates = parts.filter(part => !isSelected(part));
  const extra = candidates.find(part => part.type === '주재료') ?? candidates.find(part => part.type !== '양념') ?? candidates[0];
  return {
    id: recipe.id, title: recipe.name, imageUrl: recipe.image || asset('recipe-empty.png'),
    time: approximateTime(recipe.time), difficulty: optional(recipe.difficulty),
    tags: extra && !selected.includes(extra.name) ? [...selected, extra.name] : selected,
  };
}
export function toRecipeDetail(recipe: Recipe): RecipeDetail {
  return {
    id: recipe.id, title: recipe.name, imageUrl: recipe.image || asset('recipe-empty.png'),
    time: approximateTime(recipe.time), difficulty: optional(recipe.difficulty), servings: optional(recipe.servings),
    ingredients: recipe.ingredients.map((item, index) => ({ id: `${recipe.id}-${index}`, ...cleanIngredientParts(item.name, item.amount) })).filter(item => item.name),
    steps: recipe.steps.map(step => step.text),
  };
}
