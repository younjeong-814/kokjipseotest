import type { ReportActivity } from './activityLog';
import { pendingReports, type MyPageReports, type ReportPeriod } from './report';
import { managementScore, managementGrade } from './score';
export function periodStart(period: ReportPeriod, end: number): number {
  const date = new Date(end);
  if (period === '연간') return new Date(date.getFullYear(), 0, 1).getTime();
  if (period === '월간') return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start.getTime();
}
export function latestSix(now: number): number {
  const d = new Date(now);
  const six = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6).getTime();
  if (now >= six) return six;
  d.setDate(d.getDate() - 1);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6).getTime();
}
function periodScoreLabel(period: ReportPeriod, end: number): string {
  const date = new Date(end), year = date.getFullYear(), month = date.getMonth(), day = date.getDate();
  if (period === '연간') return `${year}년 냉장고 관리 점수`;
  if (period === '월간') return `${month + 1}월 냉장고 관리 점수`;
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  return `${month + 1}월 ${Math.ceil((day + firstDayOffset) / 7)}째주 냉장고 관리 점수`;
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
  for (const period of ['주간','월간','연간'] as const) {
    const from = periodStart(period,end), a = aggregate(events,from,end);
    const previousStart = periodStart(period,from - 1);
    const previous = aggregate(events,previousStart,from - 1);
    const labels = period === '주간' ? ['지난주','이번 주'] : period === '월간' ? ['지난달','이번 달'] : ['지난해','올해'];
    Object.assign(reports[period], {
      completedItemCount:a.completed, managedCount:a.total, managedLabel:period === '주간' ? '이번주 관리 현황' : period === '월간' ? '이번달 관리 현황' : '이번년도 관리 현황',
      scoreLabel:periodScoreLabel(period,end),
      previousLabel:labels[0],currentLabel:labels[1],
      consumed:{current:a.consumed,previous:previous?.consumed ?? null}, discarded:{current:a.discarded,previous:previous?.discarded ?? null},
      consumptionRate:a.consumptionRate, managementRate:a.managementRate,
      feedbackTitle:previous && previous.discarded > 0 ? `${labels[0]}보다 폐기율이 ${Math.round((previous.discarded-a.discarded)/previous.discarded*100)}% ${previous.discarded >= a.discarded ? '줄었어요' : '늘었어요'}!` : `${labels[0]}보다 폐기율을 비교할 기록을 모으고 있어요`,
      feedbackDescription:a.legacy ? '과거 등록일이 없는 기록은 처리일 기준으로 집계했어요.' : '같은 재료의 반복 소비·관리는 기간마다 한 번만 집계해요.',
    });
  }
  return reports;
}
export const SCORE_KEY = 'kokjipseo.management-score.v2';
type Snapshot = { cutoff:number; scores:Record<ReportPeriod,number|null> };
export function applyDailyScores(storage: Pick<Storage,'getItem'|'setItem'>, reports: MyPageReports, events: ReportActivity[], now = new Date()): MyPageReports {
  const cutoff = latestSix(now.getTime()), raw = storage.getItem(SCORE_KEY);
  let snapshot: Snapshot | null = raw === null ? null : JSON.parse(raw);
  // 기존 저장 데이터의 '전체' 점수는 연간 점수와 의미가 다르므로 새 기간 집계로 교체한다.
  if (snapshot && snapshot.scores && !('연간' in snapshot.scores)) snapshot = null;
  if (snapshot && snapshot.cutoff > cutoff) throw new Error('기기의 날짜와 시간을 확인해 주세요.');
  if (snapshot && (!Number.isFinite(snapshot.cutoff) || !snapshot.scores || !(['주간','월간','연간'] as const).every(p => snapshot!.scores[p] === null || (Number.isFinite(snapshot!.scores[p]) && snapshot!.scores[p]! >= 0 && snapshot!.scores[p]! <= 100)))) throw new Error('관리점수 저장 데이터를 읽지 못했어요.');
  if (!snapshot || snapshot.cutoff < cutoff) {
    const batch = reportsFromActivities(events,new Date(cutoff));
    snapshot = {cutoff,scores:Object.fromEntries(Object.entries(batch).map(([p,r]) => [p,managementScore(r.consumptionRate,r.managementRate ?? null)])) as Snapshot['scores']};
    storage.setItem(SCORE_KEY,JSON.stringify(snapshot));
  }
  for (const p of ['주간','월간','연간'] as const) {
    reports[p].score = snapshot.scores[p];
    reports[p].grade = managementGrade(snapshot.scores[p]);
    reports[p].scoreChange = '관리점수는 기기 현지 시간 매일 오전 6시 기준으로 갱신해요';
    reports[p].scoreUpdatedAt = new Date(snapshot.cutoff).toISOString();
  }
  return reports;
}
