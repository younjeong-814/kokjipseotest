import { asset } from '../../lib/assets';
import type { Recipe, RecipeDetail, RecipeSummary } from './types';

// API가 제공하지 않는 시간·난이도·인분은 임의로 채우지 않는다.
export function toRecipeSummary(recipe: Recipe, selectedNames: readonly string[]): RecipeSummary {
  return { id: recipe.id, title: recipe.name, imageUrl: recipe.image || asset('recipe-empty.png'), tags: selectedNames.filter(name => recipe.ingredients.includes(name) || (name === '계란' && recipe.ingredients.includes('달걀'))) };
}
export function toRecipeDetail(recipe: Recipe): RecipeDetail {
  const parts = recipe.ingredients.split(/[,\n](?![^()]*\))/).map(value => value.trim()).filter(Boolean);
  return { id: recipe.id, title: recipe.name, imageUrl: recipe.image || asset('recipe-empty.png'), ingredients: parts.map((name, index) => ({ id: `${recipe.id}-${index}`, name, amount: '' })), steps: recipe.steps.map(step => step.text) };
}
