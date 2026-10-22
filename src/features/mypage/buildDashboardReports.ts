import type { Ingredient } from '../ingredients/repository';
import { startOfWeek, type DisposalRecord } from '../report/weeklyReport';
import { discardFeedback, pendingReports, type MyPageReports, type ReportPeriod } from './report';

/** 기존 삭제 이력을 읽기만 하며 저장/소비·폐기 분류는 변경하지 않는다. */
export function buildDashboardReports(items: Ingredient[], history: DisposalRecord[], now = new Date()): MyPageReports {
  const reports = pendingReports(items.length);
  const week = startOfWeek(now);
  const previousWeek = new Date(week); previousWeek.setDate(previousWeek.getDate() - 7);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = new Date(now.getFullYear(), 0, 1);
  const previousYear = new Date(now.getFullYear() - 1, 0, 1);
  const count = (from: number, to: number, inclusiveEnd = false) => {
    const records = history.filter(record => { const time = Date.parse(record.recordedAt); return time >= from && (inclusiveEnd ? time <= to : time < to); });
    return { consumed: records.filter(record => record.action === 'consumed').length, discarded: records.filter(record => record.action === 'discarded').length };
  };
  for (const period of ['주간','월간','연간'] as ReportPeriod[]) {
    const from = period === '주간' ? week.getTime() : period === '월간' ? month.getTime() : year.getTime();
    const current = count(from, now.getTime(), true);
    const previous = count(period === '주간' ? previousWeek.getTime() : period === '월간' ? previousMonth.getTime() : previousYear.getTime(), from);
    const report = reports[period];
    report.completedItemCount = current.consumed + current.discarded;
    report.consumed = { previous: previous?.consumed ?? null, current: current.consumed };
    report.discarded = { previous: previous?.discarded ?? null, current: current.discarded };
    // 현재 보관 중인 항목과 선택 기간에 소비/폐기로 정리한 항목을 합친다.
    // 등록 6개 → 소비 2개, 폐기 2개, 보관 2개라면 소비율은 33%다.
    const totalManaged = items.length + report.completedItemCount;
    report.consumptionRate = totalManaged > 0 ? Math.round(current.consumed / totalManaged * 100) : null;
    report.managedCount = items.length + current.consumed + current.discarded;
    report.managedLabel = period === '주간' ? '이번주 관리 현황' : period === '월간' ? '이번달 관리 현황' : '이번년도 관리 현황';
    const firstDayOffset = (new Date(now.getFullYear(),now.getMonth(),1).getDay()+6)%7;
    report.scoreLabel = period === '주간' ? `${now.getMonth()+1}월 ${Math.ceil((now.getDate()+firstDayOffset)/7)}째주 냉장고 관리 점수` : period === '월간' ? `${now.getMonth()+1}월 냉장고 관리 점수` : `${now.getFullYear()}년 냉장고 관리 점수`;
    const periodName = period === '주간' ? '지난주' : period === '월간' ? '지난달' : '지난해';
    report.previousLabel = periodName;
    report.currentLabel = period === '주간' ? '이번 주' : period === '월간' ? '이번 달' : '올해';
    Object.assign(report, discardFeedback(periodName, report.currentLabel, previous.discarded, current.discarded));
    // 관리 점수는 관리율 산식이 확정될 때 연결한다.
  }
  return reports;
}
