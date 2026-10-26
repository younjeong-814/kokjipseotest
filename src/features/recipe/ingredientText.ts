// Some sources embed HTML line breaks ("2인분 기준<br>토마토"); treat them as row breaks.
const normalize = (value: string) => value.replace(/<br\s*\/?>/gi, '\n').replace(/（/g, '(').replace(/）/g, ')').replace(/\({2,}(?=\s*(?:약\s*)?\d)/g, '(').trim();

/** Section labels belong to the source layout, not to ingredient names or hashtags. */
export function cleanIngredientName(value: string): string {
  let name = normalize(value).replace(/^[\s•●▶▷※*-]+/, '');
  let previous = '';
  while (name !== previous) {
    previous = name;
    name = name
      .replace(/^(?:주재료|부재료|재료)\s*\(?\d+\s*인분\)?\s*[:：]?\s*/, '')
      // Labels may be spaced or bracketed: "필수 재료:", "[필수 재료]".
      .replace(/^[[【<]\s*[^\]】>]*?(?:재료|양념장|양념|소스|육수)\s*[\]】>]\s*[:：]?\s*/, '')
      // Any other bracketed heading without numbers: "[소스소개]", "<만드는 법>".
      .replace(/^[[【<][^\]】>\d]*[\]】>]\s*[:：]?\s*/, '')
      // Serving headers: "[2인분]", "(2~3인분 기준)", "2인분:".
      .replace(/^[[(【<]?\s*\d+(?:\s*[~∼-]\s*\d+)?\s*인분(?:\s*기준)?\s*[\])】>]?\s*[:：]?\s*/, '')
      .replace(/^(?:(?:[가-힣]+\s+)*[가-힣]*?(?:재료|양념장|양념|소스|육수)|소)\s*[:：]\s*/, '')
      // Without a colon, only "<word> 재료" is a label; "닭 육수 큐브" is an ingredient.
      .replace(/^(?:[가-힣]*?(?:재료|양념장|양념|소스|육수)|[가-힣]+\s+재료)\s+(?=[가-힣A-Za-z])/, '')
      .replace(/^소\s+(?=다진|으깬)/, '')
      .trim();
  }
  return /^(?:재료|주재료|부재료|양념장|양념|소스|육수|[가-힣]+\s+재료)\s*[:：]?$/.test(name) ? '' : name;
}

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
  let cleanName = cleanIngredientName(name).replace(/\(\s*\)/g, '').trim();
  let cleanQuantity = normalize(amount);
  // The old parser split inside "황태채(100g)". Remove the stranded wrapper only.
  if (cleanName.endsWith('(') && cleanQuantity.endsWith(')')) {
    cleanName = cleanName.slice(0, -1).trim();
    cleanQuantity = cleanQuantity.slice(0, -1).trim();
  }
  // Unitless trailing numbers ("키조개관자60", "관자 (60)") are grams by convention.
  const bare = !cleanQuantity && cleanName.match(bareQuantity);
  if (bare) { cleanName = bare[1].trim(); cleanQuantity = `${bare[2]}g`; }
  return { name: cleanName, amount: cleanAmount(cleanQuantity) };
}

const bareQuantity = /^(.*[가-힣])\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?$/;

const measurement = /(?:(?:각각?\s*)?(?:약\s*)?(?:\d+(?:\.\d+)?(?:\s*[/~∼–-]\s*\d+(?:\.\d+)?)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*(?:작은술|큰술|꼬집|줄기|스푼|조각|방울|마리|kg|mg|ml|cc|g|l|개|모|장|쪽|컵|대|줌|알|팩|봉|병|T|t)|약간|적당량)/gi;

export function splitIngredientText(value: string): { name: string; amount: string } {
  const text = cleanIngredientName(value);
  // Prefer an amount outside parentheses so "표고버섯(말린 것) 20g" keeps its qualifier.
  const depthAt: number[] = []; let depth = 0;
  for (let i = 0; i < text.length; i++) { depthAt[i] = depth; if (text[i] === '(') depth++; if (text[i] === ')') depth = Math.max(0, depth - 1); }
  const matches = [...text.matchAll(measurement)];
  const outside = matches.find(match => depthAt[match.index!] === 0);
  if (outside && outside.index! > 0) return cleanIngredientParts(text.slice(0, outside.index), text.slice(outside.index));
  // Whole quantity is wrapped: "곤약(100g)". Optional notes stay with the quantity.
  for (let open = text.indexOf('('); open > 0; open = text.indexOf('(', open + 1)) {
    if (depthAt[open] !== 0) continue;
    const inside = text.slice(open + 1, text.endsWith(')') ? -1 : undefined).trim();
    if ([...inside.matchAll(measurement)].some(match => match.index === 0)) return cleanIngredientParts(text.slice(0, open), inside);
    const innerQuantity = [...inside.matchAll(measurement)].find(match => match.index! > 0);
    if (innerQuantity) {
      const qualifier = inside.slice(0, innerQuantity.index).replace(/[,\s]+$/, '');
      return cleanIngredientParts(`${text.slice(0, open)}(${qualifier})`, inside.slice(innerQuantity.index));
    }
  }
  return cleanIngredientParts(text, '');
}

const sauceLabel = /(?:소스|양념장|양념|드레싱|육수|고명)$/;
const ingredientLabel = /(?:^|\s)(?:주재료|부재료|재료)$|인분/;

/** Rows after a sauce label ("저나트륨겨자간장소스 : 간장 2g, 식초 3g") belong to that sauce until another label. */
export function parseIngredientGroups(raw: string): { name: string; amount: string; group?: string }[] {
  let group: string | undefined;
  return tokenizeIngredientText(raw).flatMap(chunk => {
    let rest = normalize(chunk).replace(/^[\s•●▶▷※*-]+/, ''), label: RegExpMatchArray | null;
    while ((label = rest.match(/^[[【<]([^\]】>]*)[\]】>]\s*[:：]?\s*/) ?? rest.match(/^([가-힣][가-힣\s]*?)\s*[:：]\s*/))) {
      const title = label[1].trim();
      if (sauceLabel.test(title)) group = title;
      else if (ingredientLabel.test(title)) group = undefined;
      rest = rest.slice(label[0].length);
    }
    const { name, amount } = splitIngredientText(chunk);
    return name ? [group ? { name, amount, group } : { name, amount }] : [];
  });
}

/** Recover from malformed parentheses without treating quantity notes as ingredients. */
export function tokenizeIngredientText(raw: string): string[] {
  const text = normalize(raw), chunks: string[] = [];
  let depth = 0, chunk = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if ('(['.includes(char)) depth++;
    if (')]'.includes(char)) depth = Math.max(0, depth - 1);
    const separator = /[,，;\n\r]/.test(char);
    // If a bracket was never closed, a new measured ingredient still starts a row.
    const next = text.slice(i + 1).split(/[,，;\n\r]/, 1)[0].trim();
    const nextName = cleanIngredientName(next);
    const nextQuantity = [...nextName.matchAll(measurement)].find(match => match.index! > 0);
    const startsIngredient = /^[가-힣A-Za-z]/.test(nextName) && !!nextQuantity;
    let remainingDepth = depth, closesGroup = depth === 0;
    if (separator && depth > 0) for (let j = i + 1; j < text.length; j++) {
      if ('(['.includes(text[j])) remainingDepth++;
      if (')]'.includes(text[j])) remainingDepth--;
      if (remainingDepth === 0) { closesGroup = true; break; }
    }
    if (separator && (depth === 0 || (startsIngredient && !closesGroup))) {
      if (chunk.trim()) chunks.push(chunk.trim());
      chunk = ''; depth = 0;
    } else {
      chunk += char;
      // Some rows omit commas: "다시마(3g) 대파(10g)" or "두부 30g 부추 20g".
      if (depth === 0 && (char === ')' || /\s/.test(text[i + 1] ?? ''))) {
        const tail = cleanIngredientName(text.slice(i + 1).split(/[,，;\n\r]/, 1)[0]);
        const quantities = [...chunk.matchAll(measurement)];
        const last = quantities[quantities.length - 1];
        const finishesAmount = char === ')' || !!last && last.index! + last[0].length === chunk.length;
        // Unitless rows: "키조개관자60 마늘10".
        const bareRows = /[가-힣]\d+(?:\.\d+)?$/.test(chunk) && /^[가-힣]+\d+(?:\.\d+)?(?:\s|$)/.test(tail);
        if (bareRows || finishesAmount && /^[가-힣A-Za-z]/.test(tail) && [...tail.matchAll(measurement)].some(match => match.index! > 0)) {
          chunks.push(chunk.trim()); chunk = '';
        }
      }
    }
  }
  if (chunk.trim()) chunks.push(chunk.trim());
  return chunks;
}
