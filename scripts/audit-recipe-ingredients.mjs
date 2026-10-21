// Read-only audit of public ingredient text. Never print keys or request URLs.
import { readFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import ts from 'typescript';
function load(url) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', code)(exports, name => load(new URL(`${name}.ts`, url)));
  return exports;
}
const { parseIngredients } = load(new URL('../server/recipes.ts', import.meta.url));
const env = loadEnv('development', '.', '');
try {
  if (!env.FOOD_SAFETY_API_KEY?.trim()) throw new Error('Not configured');
  const recipes = [];
  for (let start = 1; start <= 10000; start += 1000) {
    const response = await fetch(`https://openapi.foodsafetykorea.go.kr/api/${encodeURIComponent(env.FOOD_SAFETY_API_KEY.trim())}/COOKRCP01/json/${start}/${start + 999}`, { signal: AbortSignal.timeout(15000) });
    const data = await response.json(), service = data.COOKRCP01;
    if (!response.ok || service?.RESULT?.CODE !== 'INFO-000' || !Array.isArray(service.row)) throw new Error('Unavailable');
    recipes.push(...service.row);
    if (start + 999 >= Number(service.total_count)) break;
  }
  const suspects = [];
  const outsideSeparators = value => {
    let depth = 0;
    for (const char of value) { if (char === '(') depth++; if (char === ')') depth = Math.max(0, depth - 1); if (depth === 0 && /[,;\n\r]/.test(char)) return true; }
    return false;
  };
  for (const row of recipes) {
    const parts = parseIngredients(row.RCP_PARTS_DTLS || '');
    for (const part of parts) if (outsideSeparators(part.name) || /^재료\s|^양념장\s/.test(part.name) || /\)\s*[가-힣]+\s*\(\d/.test(part.amount)) suspects.push({ recipe: row.RCP_NM, name: part.name, amount: part.amount });
  }
  console.log(JSON.stringify({ recipesChecked: recipes.length, suspiciousRows: suspects.length, examples: suspects.slice(0, 12), requestedRecipes: recipes.filter(row => ['배추만두탕', '맑은부대찌개', '쇠고기표고찜', '두부청국장죽'].includes(row.RCP_NM)).map(row => { const parts = parseIngredients(row.RCP_PARTS_DTLS || ''); return { id: row.RCP_SEQ, name: row.RCP_NM, rows: parts.length, firstIngredient: parts[0]?.name }; }) }, null, 2));
} catch { console.log('Recipe audit failed; credentials and request URLs were not printed.'); process.exitCode = 1; }
