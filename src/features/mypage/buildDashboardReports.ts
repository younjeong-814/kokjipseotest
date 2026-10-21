import type { Ingredient } from '../ingredients/repository';
import { startOfWeek, type DisposalRecord } from '../report/weeklyReport';
import { pendingReports, type MyPageReports, type ReportPeriod } from './report';

/** 기존 삭제 이력을 읽기만 하며 저장/소비·폐기 분류는 변경하지 않는다. */
export function buildDashboardReports(items: Ingredient[], history: DisposalRecord[], now = new Date()): MyPageReports {
  const reports = pendingReports(items.length);
  const week = startOfWeek(now);
  const previousWeek = new Date(week); previousWeek.setDate(previousWeek.getDate() - 7);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const count = (from: number, to: number, inclusiveEnd = false) => {
    const records = history.filter(record => { const time = Date.parse(record.recordedAt); return time >= from && (inclusiveEnd ? time <= to : time < to); });
    return { consumed: records.filter(record => record.action === 'consumed').length, discarded: records.filter(record => record.action === 'discarded').length };
  };
  for (const period of ['주간','월간','전체'] as ReportPeriod[]) {
    const from = period === '주간' ? week.getTime() : period === '월간' ? month.getTime() : -Infinity;
    const current = count(from, now.getTime(), true);
    const previous = period === '전체' ? null : count(period === '주간' ? previousWeek.getTime() : previousMonth.getTime(), from);
    const report = reports[period];
    report.completedItemCount = current.consumed + current.discarded;
    report.consumed = { previous: previous?.consumed ?? null, current: current.consumed };
    report.discarded = { previous: previous?.discarded ?? null, current: current.discarded };
    // 현재 보관 중인 항목과 선택 기간에 소비/폐기로 정리한 항목을 합친다.
    // 등록 6개 → 소비 2개, 폐기 2개, 보관 2개라면 소비율은 33%다.
    const totalManaged = items.length + report.completedItemCount;
    report.consumptionRate = totalManaged > 0 ? Math.round(current.consumed / totalManaged * 100) : null;
    const weekly = count(week.getTime(), now.getTime(), true);
    report.managedCount = items.length + weekly.consumed + weekly.discarded;
    report.managedLabel = '이번주 관리 현황';
    report.feedbackTitle = `소비 ${current.consumed}개 · 폐기 ${current.discarded}개를 기록했어요`;
    report.feedbackDescription = '저장된 소비·폐기 기록을 반영했어요.';
    // 관리 점수는 관리율 산식이 확정될 때 연결한다.
  }
  return reports;
}
