import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadTs(url) {
  const source = readFileSync(url, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', 'require', compiled)(exports, path => loadTs(new URL(`${path}.ts`, url)));
  return exports;
}
const load = path => loadTs(new URL(path, import.meta.url));
const { classifyIngredient } = load('../src/features/ingredients/classify.ts');
const { categories } = load('../src/features/ingredients/repository.ts');
const expiry = load('../src/features/ingredients/expiry.ts');

// 상품명 → 기대 카테고리. 틀리는 사례를 찾으면 여기에 한 줄 추가하고 classify.ts 사전을 고친다.
const cases = [
  // 기본
  ['대파', '채소'], ['양파', '채소'], ['국산 깐마늘', '채소'], ['특등급 국산콩 콩나물', '채소'],
  ['햇사과 홍로', '과일'], ['단감', '과일'], ['배', '과일'], ['샤인머스캣', '과일'],
  ['한돈 삼겹살', '육류'], ['저온숙성 무항생제 한돈삼겹살', '육류'], ['생닭', '육류'],
  ['손질 생고등어', '수산물'], ['생굴', '수산물'], ['꽃게', '수산물'], ['광어회', '수산물'],
  ['CJ 행복한콩 두부', '두부·콩류'], ['완두콩', '두부·콩류'],
  ['서울우유', '유제품'], ['크림치즈', '유제품'],
  ['샘표 조선국간장', '조미료'], ['새우젓', '조미료'], ['딸기잼', '조미료'],
  ['존쿡 델리미트 킬바사 소시지', '가공식품'], ['비비고 왕교자', '가공식품'], ['조미김', '가공식품'],
  // 규칙 2: 뒤에 오는 명사가 이긴다
  ['딸기우유', '유제품'], ['바나나우유', '유제품'], ['고추장', '조미료'], ['사과식초', '조미료'],
  ['닭가슴살 소시지', '가공식품'], ['우유식빵', '가공식품'], ['피자치즈', '유제품'], ['참치캔', '가공식품'],
  ['샐러드 드레싱', '조미료'], ['갈비양념', '조미료'], ['전복죽', '가공식품'], ['새우깡', '가공식품'], ['고기만두', '가공식품'],
  // 규칙 3: 끝 위치가 같으면 긴 키워드
  ['아이스크림', '가공식품'], ['고춧가루', '조미료'], ['김치찌개', '가공식품'], ['된장국', '가공식품'], ['갈비탕', '가공식품'],
  // 규칙 4: 한 글자 키워드는 단어 끝에서만
  ['파프리카', '채소'], ['배추', '채소'], ['감자', '채소'], ['단무지', '가공식품'], ['굴소스', '조미료'], ['젓갈', '가공식품'], ['게맛살', '가공식품'],
  // 규칙 5: 모르면 기타
  ['키친타월', '기타'], ['종량제봉투', '기타'], ['', '기타'],
];

for (const [name, expected] of cases) {
  test(`${name || '(빈 이름)'} → ${expected}`, () => assert.equal(classifyIngredient(name), expected));
}

test('every dictionary category is a registrable category', () => {
  const source = readFileSync(new URL('../src/features/ingredients/classify.ts', import.meta.url), 'utf8');
  const used = [...source.matchAll(/^\s+'([^']+)': \[/gm)].map(match => match[1]);
  assert.ok(used.length > 0);
  for (const category of [...used, '기타']) assert.ok(categories.includes(category), category);
});

// 브랜드·수식어가 붙어도 분류 규칙의 키워드가 DB에 있으면 그 행을 쓴다. 없으면 추측하지 않는다.
test('recommendation lookup falls back to the classification keyword', () => {
  for (const [name, expected] of [['두부', '두부'], ['풀무원 국산콩 두부', '두부'], ['서울우유', '우유'], ['딸기우유', '우유'], ['김치찌개', null], ['한돈 삼겹살', null], ['키친타월', null]]) {
    assert.equal(expiry.recommendationName(name), expected, name);
  }
  assert.equal(expiry.calculateRecommendedDate('풀무원 국산콩 두부', '냉장', '2026-10-13'), expiry.calculateRecommendedDate('두부', '냉장', '2026-10-13'));
  assert.notEqual(expiry.calculateRecommendedDate('서울우유', '냉장', '2026-10-13'), '');
});

test('default storage: single record, then 냉장 → 실온 → 냉동, skipping 비권장 rows', () => {
  for (const [name, expected] of [
    ['마늘', '실온'],         // 기록 하나
    ['냉동만두', '냉동'],     // 기록 하나
    ['두부', '냉장'],         // 냉장 있음
    ['대파', '냉장'],         // 냉장·냉동 → 냉장
    ['양파', '실온'],         // 실온 + 냉동(비권장)
    ['감자', '실온'],         // 실온·냉동 → 실온
    ['귤', '냉장'],           // 냉장 + 냉동(비권장) → 냉장
    ['크림치즈', '냉장'],     // "냉동 비권장" 메모는 냉장 행을 막지 않음
    ['풀무원 국산콩 두부', '냉장'], // 브랜드명 → 두부
    ['키친타월', '냉장'],     // DB에 없음 → 기본값
  ]) assert.equal(expiry.defaultStorage(name), expected, name);
});

