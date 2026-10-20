// Read-only live check. Never print environment values, request URLs or upstream errors.
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadEnv } from 'vite';
function load(url) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', source)(exports, name => load(new URL(`${name}.ts`, url)));
  return exports;
}
const api = load(new URL('../server/recipes.ts', import.meta.url));
const { enrichRecipes } = load(new URL('../server/recipeEnrichment.ts', import.meta.url));
const env = loadEnv('development', '.', '');
if (!env.FOOD_SAFETY_API_KEY?.trim()) { console.log('Food safety key is not configured.'); process.exitCode = 1; }
else {
  const food = [], basic = [];
  const search = api.createRecipeSearch(env.FOOD_SAFETY_API_KEY, async (url, options) => {
    const response = await fetch(url, options);
    try {
      const body = await response.clone().json();
      if (url.includes('/COOKRCP01/')) food.push(...api.parseFoodPage(body).recipes);
      else basic.push(...api.parseBasicPage(body).rows);
    } catch { /* The search function handles actual upstream errors. */ }
    return response;
  }, env.FOOD_API_KEY);
  try {
    const result = await search(['소고기']);
    const recipes = enrichRecipes([...new Map(food.map(recipe => [recipe.id, recipe])).values()], basic);
    console.log(JSON.stringify({
      foodSafetyRecipes: recipes.length, mafraBasicRecipes: basic.length,
      matchedTimes: recipes.filter(recipe => recipe.metadata.timeSource === 'mafra').length,
      matchedDifficulties: recipes.filter(recipe => recipe.metadata.difficultySource === 'mafra').length,
      calibratedEstimates: recipes.filter(recipe => recipe.metadata.timeSource === 'estimated' && recipe.metadata.calibrationSamples > 0).length,
      difficultyCalibratedEstimates: recipes.filter(recipe => recipe.metadata.difficultySource === 'estimated' && recipe.metadata.difficultyCalibrationSamples > 0).length,
      searchResults: result.total, allTimesApproximate: recipes.every(recipe => /^약 \d+분$/.test(recipe.time)),
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ error: error instanceof api.RecipeApiError ? error.message : 'Network or malformed response', foodRowsReceived: food.length, basicRowsReceived: basic.length }));
    process.exitCode = 1;
  }
}
