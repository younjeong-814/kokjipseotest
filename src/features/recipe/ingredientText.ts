const normalize = (value: string) => value.replace(/（/g, '(').replace(/）/g, ')').trim();

/** Strip only an enclosing pair (or empty pairs); retain conversions and preparation notes. */
function cleanAmount(value: string): string {
  let amount = normalize(value).replace(/\(\s*\)/g, '').trim();
  while (amount.startsWith('(') && amount.endsWith(')')) {
    let depth = 0, enclosesAll = true;
    for (let i = 0; i < amount.length; i++) {
      if (amount[i] === '(') depth++;
      if (amount[i] === ')') depth--;
      if (depth === 0 && i < amount.length - 1) { enclosesAll = false; break; }
    }
    if (!enclosesAll || depth !== 0) break;
    amount = amount.slice(1, -1).trim();
  }
  return amount;
}

/** Also repairs name/amount pairs cached before the parser fix. */
export function cleanIngredientParts(name: string, amount: string) {
  let cleanName = normalize(name).replace(/\(\s*\)/g, '').trim();
  let cleanQuantity = normalize(amount);
  // The old parser split inside "황태채(100g)". Remove the stranded wrapper only.
  if (cleanName.endsWith('(') && cleanQuantity.endsWith(')')) {
    cleanName = cleanName.slice(0, -1).trim();
    cleanQuantity = cleanQuantity.slice(0, -1).trim();
  }
  return { name: cleanName, amount: cleanAmount(cleanQuantity) };
}

const measurement = /(?:(?:약\s*)?\d+(?:\.\d+)?(?:\s*[/~∼–-]\s*\d+(?:\.\d+)?)?\s*(?:작은술|큰술|꼬집|줄기|스푼|조각|방울|마리|kg|mg|ml|cc|g|l|개|모|장|쪽|컵|대|줌|알|팩|봉|병|T|t)|약간|적당량)/gi;

export function splitIngredientText(value: string): { name: string; amount: string } {
  const text = normalize(value).replace(/^(?:주재료|부재료|양념|재료|소스)\s*[:：]\s*/, '');
  // Prefer an amount outside parentheses so "표고버섯(말린 것) 20g" keeps its qualifier.
  const depthAt: number[] = []; let depth = 0;
  for (let i = 0; i < text.length; i++) { depthAt[i] = depth; if (text[i] === '(') depth++; if (text[i] === ')') depth = Math.max(0, depth - 1); }
  const matches = [...text.matchAll(measurement)];
  const outside = matches.find(match => depthAt[match.index!] === 0);
  if (outside && outside.index! > 0) return cleanIngredientParts(text.slice(0, outside.index), text.slice(outside.index));
  // Whole quantity is wrapped: "곤약(100g)". Optional notes stay with the quantity.
  for (let open = text.indexOf('('); open > 0; open = text.indexOf('(', open + 1)) {
    if (depthAt[open] !== 0 || !text.endsWith(')')) continue;
    const inside = text.slice(open + 1, -1).trim();
    if ([...inside.matchAll(measurement)].some(match => match.index === 0)) return cleanIngredientParts(text.slice(0, open), inside);
  }
  return cleanIngredientParts(text, '');
}
