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
const report = loadTs(new URL('../src/features/report/weeklyReport.ts', import.meta.url));
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
const item = (name, extra = {}) => ({ id: name, name, date: '2026-10-25', conditionHistory: [], ...extra });

test('지난 소비 권장일이나 상했어요 기록이 있으면 폐기로 분류한다', () => {
  const now = new Date(2026, 9, 21, 12);
  assert.equal(report.classifyDisposal(item('달걀'), now), 'consumed');
  assert.equal(report.classifyDisposal(item('양파', { date: '2026-10-20' }), now), 'discarded');
  assert.equal(report.classifyDisposal(item('두부', { conditionHistory: [{ status: '못 먹겠어요 (상했어요)' }] }), now), 'discarded');
});

test('이번 주 기록만 집계하고 TOP 3는 횟수, 최근 순으로 정렬한다', () => {
  const storage = memory();
  report.recordDisposal(storage, item('지난주'), new Date(2026, 9, 18, 12));
  report.recordDisposal(storage, item('대파'), new Date(2026, 9, 19, 9));
  report.recordDisposal(storage, item('달걀'), new Date(2026, 9, 19, 10));
  report.recordDisposal(storage, item('달걀'), new Date(2026, 9, 20, 10));
  report.recordDisposal(storage, item('상추', { date: '2026-10-01' }), new Date(2026, 9, 20, 11));
  const result = report.buildWeeklyReport([{}, {}], report.loadHistory(storage), new Date(2026, 9, 21, 12));
  assert.deepEqual(result, { stored: 2, consumed: 3, discarded: 1, topConsumed: ['달걀', '대파'], topDiscarded: ['상추'] });
});

test('한 줄 제안은 자주 폐기한 재료를 조사에 맞춰 안내한다', () => {
  assert.deepEqual(report.suggestionLines({ topDiscarded: ['양파', '두부', '상추'] }), ['양파와 두부가 자주 남아요', '다음에는 조금 적게 사도 충분할 것 같아요']);
  assert.equal(report.suggestionLines({ topDiscarded: ['당근', '상추'] })[0], '당근과 상추가 자주 남아요');
  assert.equal(report.suggestionLines({ topDiscarded: ['우유', '시금치'] })[0], '우유와 시금치가 자주 남아요');
  assert.equal(report.suggestionLines({ topDiscarded: ['당근'] })[0], '당근이 자주 남아요');
  assert.equal(report.suggestionLines({ topDiscarded: [] })[0], '이번 주는 버린 재료가 없어요');
});
