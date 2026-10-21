import type { ReportActivity } from './activityLog';
import { pendingReports, type MyPageReports, type ReportPeriod } from './report';
import { managementScore, managementGrade } from './score';
const DAY = 86400000, KST = 9 * 3600000;
export function periodStart(period: ReportPeriod, end: number): number {
  const d = new Date(end + KST);
  if (period === '전체') return -Infinity;
  if (period === '월간') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - KST;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - KST - ((d.getUTCDay() + 6) % 7) * DAY;
}
export function latestSix(now: number): number {
  const d = new Date(now + KST);
  const six = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 6) - KST;
  return now < six ? six - DAY : six;
}
function aggregate(events: ReportActivity[], from: number, end: number) {
  const valid = [...new Map(events.filter(e => Number.isFinite(Date.parse(e.at)) && Date.parse(e.at) <= end).map(e => [e.id,e])).values()];
  const registrations = valid.filter(e => e.type === 'registered');
  const target = new Set(registrations.filter(r => !valid.some(e => e.itemId === r.itemId && (e.type === 'consumed' || e.type === 'discarded') && Date.parse(e.at) < from)).map(e => e.itemId));
  const inPeriod = valid.filter(e => target.has(e.itemId) && Date.parse(e.at) >= from);
  const ids = (types: string[]) => new Set(inPeriod.filter(e => types.includes(e.type)).map(e => e.itemId));
  const consumed = ids(['consumed','partial']), discarded = ids(['discarded']), managed = ids(['condition','storage']);
  const rate = (count: number) => target.size ? count / target.size * 100 : null;
  return { total: target.size, consumed: consumed.size, discarded: discarded.size, completed: ids(['consumed','discarded']).size, consumptionRate: rate(consumed.size), managementRate: rate(managed.size), legacy: registrations.some(e => e.legacy && target.has(e.itemId)) };
}
export function reportsFromActivities(events: ReportActivity[], now = new Date()): MyPageReports {
  const reports = pendingReports(0), end = now.getTime();
  for (const period of ['주간','월간','전체'] as const) {
    const from = periodStart(period,end), a = aggregate(events,from,end);
    const previousStart = period === '월간' ? periodStart(period,from - 1) : from - 7 * DAY;
    const previous = period === '전체' ? null : aggregate(events,previousStart,from - 1);
    Object.assign(reports[period], {
      completedItemCount:a.completed, managedCount:a.total, managedLabel:`${period} 관리 대상`,
      consumed:{current:a.consumed,previous:previous?.consumed ?? null}, discarded:{current:a.discarded,previous:previous?.discarded ?? null},
      consumptionRate:a.consumptionRate, managementRate:a.managementRate,
      feedbackTitle:`소비 ${a.consumed}개 · 폐기 ${a.discarded}개를 기록했어요`,
      feedbackDescription:a.legacy ? '과거 등록일이 없는 기록은 처리일 기준으로 집계했어요.' : '같은 재료의 반복 소비·관리는 기간마다 한 번만 집계해요.',
    });
  }
  return reports;
}
export const SCORE_KEY = 'kokjipseo.management-score.v1';
type Snapshot = { cutoff:number; scores:Record<ReportPeriod,number|null> };
export function applyDailyScores(storage: Pick<Storage,'getItem'|'setItem'>, reports: MyPageReports, events: ReportActivity[], now = new Date()): MyPageReports {
  const cutoff = latestSix(now.getTime()), raw = storage.getItem(SCORE_KEY);
  let snapshot: Snapshot | null = raw === null ? null : JSON.parse(raw);
  if (snapshot && snapshot.cutoff > cutoff) throw new Error('기기의 날짜와 시간을 확인해 주세요.');
  if (snapshot && (!Number.isFinite(snapshot.cutoff) || !snapshot.scores || !(['주간','월간','전체'] as const).every(p => snapshot!.scores[p] === null || (Number.isFinite(snapshot!.scores[p]) && snapshot!.scores[p]! >= 0 && snapshot!.scores[p]! <= 100)))) throw new Error('관리점수 저장 데이터를 읽지 못했어요.');
  if (!snapshot || snapshot.cutoff < cutoff) {
    const batch = reportsFromActivities(events,new Date(cutoff));
    snapshot = {cutoff,scores:Object.fromEntries(Object.entries(batch).map(([p,r]) => [p,managementScore(r.consumptionRate,r.managementRate ?? null)])) as Snapshot['scores']};
    storage.setItem(SCORE_KEY,JSON.stringify(snapshot));
  }
  for (const p of ['주간','월간','전체'] as const) {
    reports[p].score = snapshot.scores[p];
    reports[p].grade = managementGrade(snapshot.scores[p]);
    reports[p].scoreChange = '관리점수는 한국 시간 매일 오전 6시 기준으로 갱신해요';
    reports[p].scoreUpdatedAt = new Date(snapshot.cutoff).toISOString();
  }
  return reports;
}
