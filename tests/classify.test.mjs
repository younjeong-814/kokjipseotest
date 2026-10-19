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
const { classifyIngredient, isExcludedItem } = load('../src/features/ingredients/classify.ts');
const { validateDraft } = load('../src/features/ingredients/repository.ts');
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
  ['샘표 조선국간장', '조미료·소스'], ['새우젓', '조미료·소스'], ['딸기잼', '조미료·소스'], ['롯데 미림', '조미료·소스'],
  ['존쿡 델리미트 킬바사 소시지', '기타식재료'], ['비비고 왕교자', '기타음식'], ['조미김', '반찬'],
  // 기타식재료: 조리 재료로 쓰는 곡류·견과·음료 원료·가루·계란
  ['이천쌀 10kg', '기타식재료'], ['구운아몬드', '기타식재료'], ['콜롬비아 원두', '기타식재료'], ['백설 부침가루', '기타식재료'], ['튀김가루', '기타식재료'], ['드라이 이스트', '기타식재료'], ['유정란', '기타식재료'],
  // 기타음식: 바로 먹거나 데워 먹는 완제품
  ['코카콜라', '기타음식'], ['오렌지주스', '기타음식'], ['콜드브루 커피', '기타음식'], ['리코타 샐러드', '기타음식'], ['햄치즈 샌드위치', '기타음식'], ['신라면', '기타음식'], ['찹쌀떡', '기타음식'], ['츄파춥스 사탕', '기타음식'],
  // 반찬·국·찌개·밀키트
  ['종가 포기김치', '반찬'], ['멸치볶음', '반찬'], ['부대찌개', '국·찌개'], ['마이셰프 밀키트', '밀키트'],
  // 규칙 2: 뒤에 오는 명사가 이긴다
  ['딸기우유', '유제품'], ['바나나우유', '유제품'], ['고추장', '조미료·소스'], ['사과식초', '조미료·소스'],
  ['닭가슴살 소시지', '기타식재료'], ['우유식빵', '기타음식'], ['피자치즈', '유제품'], ['참치캔', '수산물'],
  ['샐러드 드레싱', '조미료·소스'], ['갈비양념', '조미료·소스'], ['전복죽', '기타음식'], ['새우깡', '기타음식'], ['고기만두', '기타음식'], ['녹차라떼', '기타음식'], ['샐러드채소', '채소'],
  // 규칙 3: 끝 위치가 같으면 긴 키워드
  ['아이스크림', '기타음식'], ['고춧가루', '조미료·소스'], ['김치찌개', '국·찌개'], ['된장국', '국·찌개'], ['갈비탕', '국·찌개'], ['김밥', '기타음식'], ['볶음밥', '기타음식'],
  // 규칙 4: 한 글자 키워드는 단어 끝에서만
  ['파프리카', '채소'], ['배추', '채소'], ['감자', '채소'], ['단무지', '반찬'], ['굴소스', '조미료·소스'], ['젓갈', '반찬'], ['게맛살', '기타식재료'],
  // 규칙 5: 모르면 기타식재료
  ['키친타월', '기타식재료'], ['', '기타식재료'],
];

for (const [name, expected] of cases) {
  test(`${name || '(빈 이름)'} → ${expected}`, () => assert.equal(classifyIngredient(name), expected));
}

// 비식품·주류는 인식 결과에서 뺀다. 요리용 술과 이름이 비슷한 식품은 남긴다.
const excluded = [
  ['크리넥스 화장지 30롤', true], ['피죤 섬유유연제', true], ['건전지 AA', true], ['담배', true], ['종량제봉투', true], ['키친타월', true], ['센트룸 멀티비타민', true], ['신신 파스', true], ['샴푸', true], ['위생장갑', true],
  ['참이슬 후레쉬', true], ['카스 프레시', true], ['장수막걸리', true], ['레드와인', true], ['하이트 제로', true],
  ['롯데 미림', false], ['맛술', false], ['와인식초', false], ['카스테라', false], ['토마토 파스타', false], ['크랩 샐러드', false], ['서울우유', false], ['대파', false],
];
for (const [name, expected] of excluded) {
  test(`${name}: ${expected ? '제외' : '식품'}`, () => assert.equal(isExcludedItem(name), expected));
}

test('every dictionary category is a registrable category', () => {
  const source = readFileSync(new URL('../src/features/ingredients/classify.ts', import.meta.url), 'utf8');
  const used = [...source.matchAll(/^\s+'([^']+)': \[/gm)].map(match => match[1]);
  assert.ok(used.length > 0);
  // OCR still emits legacy labels; they remain valid storage values even though
  // the manual picker exposes the new 13-category design.
  for (const category of [...used, '기타']) assert.equal(validateDraft({ name: '검증', category, storage: '냉장', quantity: 1, unit: '개', date: '' }), null, category);
});

test('shared thumbnails cover the five food categories and legacy ingredient labels', () => {
  const { categoryImage } = load('../src/features/ingredients/images.ts');
  for (const [category, expected] of [['밀키트','food-category-mealkit.png'], ['반찬','food-category-side-dish.png'], ['국·찌개','food-category-soup.png'], ['국·탕','food-category-soup.png'], ['배달음식','food-category-delivery.png'], ['기타음식','food-category-etc.png'], ['조미료·소스','thumb-sauce.png'], ['유제품','thumb-dairy.png']]) {
    assert.equal(categoryImage(category), expected);
    assert.ok(readFileSync(new URL(`../public/assets/${expected}`, import.meta.url)).length > 0);
  }
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

