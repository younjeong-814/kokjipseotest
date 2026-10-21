// 이번주 관리 현황 리포트.
// 냉장고에서 식재료를 삭제하면 소비/폐기 기록을 남기고, 이번 주(월~일) 기록과 현재 보관 중인 재료로 리포트를 만든다.
import type { Ingredient } from '../ingredients/repository';
import { particle } from '../../lib/korean';

export const REPORT_HISTORY_KEY = 'kokjipseo.ingredient-history.v1';
export type DisposalAction = 'consumed' | 'discarded';
export type DisposalRecord = { id: string; name: string; action: DisposalAction; recordedAt: string; createdAt?: string; category?: string; kind?: 'ingredient' | 'food'; expiryDate?: string };
export type WeeklyReport = {
  stored: number;
  consumed: number;
  discarded: number;
  topConsumed: string[];
  topDiscarded: string[];
};
type LocalStorage = Pick<Storage, 'getItem' | 'setItem'>;

const SPOILED = '못 먹겠어요 (상했어요)';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// 마지막 상태 기록이 '상했어요'이거나 소비 권장일이 지난 재료를 지우면 폐기, 그 외는 소비로 본다.
export function classifyDisposal(item: Pick<Ingredient, 'date' | 'conditionHistory'>, now = new Date()): DisposalAction {
  if (item.conditionHistory?.[0]?.status === SPOILED) return 'discarded';
  if (item.date && item.date < dateKey(now)) return 'discarded';
  return 'consumed';
}

export function loadHistory(storage: Pick<Storage, 'getItem'>): DisposalRecord[] {
  try {
    const data: unknown = JSON.parse(storage.getItem(REPORT_HISTORY_KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((record): record is DisposalRecord => record && typeof record.name === 'string' && (record.action === 'consumed' || record.action === 'discarded') && Number.isFinite(Date.parse(record.recordedAt)));
  } catch { return []; }
}

export function recordDisposal(storage: LocalStorage, item: Pick<Ingredient, 'id' | 'name' | 'date' | 'conditionHistory'> & Partial<Pick<Ingredient, 'createdAt' | 'category' | 'kind'>>, now = new Date(), action?: DisposalAction): DisposalRecord[] {
  const record: DisposalRecord = { id: item.id, name: item.name.trim(), action: action ?? classifyDisposal(item, now), recordedAt: now.toISOString(), createdAt: item.createdAt, category: item.category, kind: item.kind, expiryDate: item.date };
  const next = [record, ...loadHistory(storage)].slice(0, 500);
  storage.setItem(REPORT_HISTORY_KEY, JSON.stringify(next));
  return next;
}

// 이번 주 월요일 0시
export function startOfWeek(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

// 많이 기록된 순, 같으면 최근에 기록된 순
function top3(records: DisposalRecord[]) {
  const counts = new Map<string, { count: number; latest: number }>();
  for (const record of records) {
    const time = Date.parse(record.recordedAt);
    const previous = counts.get(record.name);
    counts.set(record.name, { count: (previous?.count ?? 0) + 1, latest: Math.max(previous?.latest ?? 0, time) });
  }
  return [...counts].sort((a, b) => b[1].count - a[1].count || b[1].latest - a[1].latest).slice(0, 3).map(([name]) => name);
}

export function buildWeeklyReport(items: Ingredient[], history: DisposalRecord[], now = new Date()): WeeklyReport {
  const from = startOfWeek(now).getTime();
  const thisWeek = history.filter(record => { const time = Date.parse(record.recordedAt); return time >= from && time <= now.getTime(); });
  const consumed = thisWeek.filter(record => record.action === 'consumed');
  const discarded = thisWeek.filter(record => record.action === 'discarded');
  return { stored: items.length, consumed: consumed.length, discarded: discarded.length, topConsumed: top3(consumed), topDiscarded: top3(discarded) };
}

// 배너 '콕집서의 한 줄 제안' 문구: 자주 폐기한 재료 1~2개를 짚어 준다 (Figma 3206:2488)
export function suggestionLines(report: Pick<WeeklyReport, 'topDiscarded'>): [string, string] {
  const [first, second] = report.topDiscarded;
  if (!first) return ['이번 주는 버린 재료가 없어요', '지금처럼 필요한 만큼만 사서 챙겨 드세요'];
  const subject = second ? `${first}${particle(first, '과', '와')} ${second}` : first;
  const last = second ?? first;
  return [`${subject}${particle(last, '이', '가')} 자주 남아요`, '다음에는 조금 적게 사도 충분할 것 같아요'];
}
