// 냉장고 식재료 검색 규칙. 화면과 분리해 둔 순수 함수다.
const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JAMO = /[ㄱ-ㆎ]/;
// 비교 대상 글자: 영문·숫자·완성 한글·자모. 공백과 특수문자(· % - 등)는 버린다.
const KEEP = /[0-9a-z가-힣ㄱ-ㆎ]/;

export type SearchQuery =
  | { type: 'idle' } // 비어 있음, 공백·특수문자만: 검색하지 않고 처음 상태로
  | { type: 'hold' } // 자모 1자, 모음만, 초성+완성 글자 혼합: 직전 화면 유지
  | { type: 'text' | 'choseong'; keyword: string; raw: string; words?: string[] };

/** 0 정확히 일치, 1 시작 일치, 2 포함, 3 띄어쓴 단어 모두 포함, 4 초성 일치, 5 카테고리 일치 */
export type SearchRank = 0 | 1 | 2 | 3 | 4 | 5;
/** ranges: 원래 이름에서 강조할 [시작, 끝) 구간들. 겹치지 않고 앞에서부터 정렬돼 있다. */
export type SearchMatch = { rank: SearchRank; ranges?: [number, number][]; category?: boolean };

// 비교용 문자열과, 비교용 글자 하나하나가 원래 문자열의 몇 번째 글자였는지를 함께 돌려준다 (하이라이트 위치 계산용).
function normalize(text: string) {
  let value = '';
  const map: number[] = [];
  [...text.toLowerCase()].forEach((char, index) => {
    if (KEEP.test(char)) { value += char; map.push(index); }
  });
  return { value, map };
}

const choseongOf = (text: string) => [...text].map(char => {
  const code = char.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 ? CHOSEONG[Math.floor(code / 588)] : char;
}).join('');

export function parseQuery(raw: string): SearchQuery {
  const { value } = normalize(raw);
  if (!value) return { type: 'idle' };
  if ([...value].every(char => JAMO.test(char))) {
    return value.length >= 2 && [...value].every(char => CHOSEONG.includes(char)) ? { type: 'choseong', keyword: value, raw: raw.trim() } : { type: 'hold' };
  }
  // 입력 중인 끝 자모는 떼고 검색한다 (두ㅂ → 두). 중간에 자모가 남아 있으면 판단을 미룬다.
  const keyword = value.replace(/[ㄱ-ㆎ]+$/, '');
  if (JAMO.test(keyword)) return { type: 'hold' };
  // 띄어쓰기로 나눈 단어. 2개 이상일 때만 '단어 모두 포함'으로도 찾는다 (샘표 간장 → 샘표 국간장).
  const words = raw.split(/\s+/).map(word => normalize(word).value.replace(/[ㄱ-ㆎ]+$/, '')).filter(Boolean);
  return { type: 'text', keyword, raw: raw.trim(), ...(words.length >= 2 && { words }) };
}

// 카테고리는 정확히 같거나, 2자 이상이면 위치와 상관없이 포함될 때 맞는다 ('채' 한 글자로 채소 전체가 쏟아지지 않게).
function matchesCategory(category: string, keyword: string) {
  const value = normalize(category).value;
  return value === keyword || (keyword.length >= 2 && value.includes(keyword));
}

// 같은 글자를 두 단어가 함께 가리킬 수 있으니(파 파) 겹치는 구간은 합친다.
function mergeRanges(ranges: [number, number][]) {
  const merged: [number, number][] = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function matchIngredient(item: { name: string; category: string }, query: SearchQuery): SearchMatch | null {
  if (query.type !== 'text' && query.type !== 'choseong') return null;
  const { keyword } = query;
  const name = normalize(item.name);
  const target = query.type === 'choseong' ? choseongOf(name.value) : name.value;
  const index = target.indexOf(keyword);
  const toRange = (start: number, length: number): [number, number] => [name.map[start], name.map[start + length - 1] + 1];
  if (index >= 0) {
    const rank: SearchRank = query.type === 'choseong' ? 4 : target === keyword ? 0 : index === 0 ? 1 : 2;
    return { rank, ranges: [toRange(index, keyword.length)] };
  }
  if (query.type === 'choseong') return null;
  const words = query.words?.map(word => ({ word, index: name.value.indexOf(word) }));
  if (words?.every(({ index }) => index >= 0)) return { rank: 3, ranges: mergeRanges(words.map(({ word, index }) => toRange(index, word.length))) };
  return matchesCategory(item.category, keyword) ? { rank: 5, category: true } : null;
}

export function searchIngredients<T extends { id: string; name: string; category: string }>(items: readonly T[], query: SearchQuery) {
  const matches = new Map<string, SearchMatch>();
  for (const item of items) {
    const match = matchIngredient(item, query);
    if (match) matches.set(item.id, match);
  }
  return matches;
}

/** 사용자가 고른 정렬을 먼저 적용한 목록을 받아 묶음 순서로 다시 세운다. 정렬이 안정적이라 같은 묶음 안의 순서는 그대로다. */
export function orderByRank<T extends { id: string }>(items: readonly T[], matches: ReadonlyMap<string, SearchMatch>) {
  return items.filter(item => matches.has(item.id)).sort((a, b) => matches.get(a.id)!.rank - matches.get(b.id)!.rank);
}
