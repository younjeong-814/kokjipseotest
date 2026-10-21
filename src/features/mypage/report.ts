export type ReportPeriod = '주간' | '월간' | '연간';
export type MyPageReport = {
  completedItemCount?: number;
  scoreLabel: string;
  score: number | null;
  grade: string;
  scoreChange: string;
  feedbackTitle: string;
  feedbackDescription: string;
  previousLabel: string;
  currentLabel: string;
  consumed: { previous: number | null; current: number | null };
  discarded: { previous: number | null; current: number | null };
  managedLabel: string;
  managedCount: number;
  consumptionRate: number | null;
  consumptionLabel: string;
  managementRate?: number | null;
  scoreUpdatedAt?: string;
};
export type MyPageReports = Record<ReportPeriod, MyPageReport>;

export function pendingReports(registeredCount: number): MyPageReports {
  return Object.fromEntries((['주간','월간','연간'] as const).map(period => [period, {
    completedItemCount: 0, scoreLabel: period === '주간' ? '이번 주 냉장고 관리 점수' : period === '월간' ? '이번 달 냉장고 관리 점수' : '올해 냉장고 관리 점수', score: null, grade: '관리 기록을 모으고 있어요', scoreChange: '비교 데이터가 아직 없어요',
    feedbackTitle: '나만의 냉장고 리포트를 준비 중이에요', feedbackDescription: '소비·폐기 기록이 연결되면 확인할 수 있어요.',
    previousLabel: period === '주간' ? '지난주' : period === '월간' ? '지난달' : '지난해', currentLabel: period === '주간' ? '이번 주' : period === '월간' ? '이번 달' : '올해',
    consumed: { previous: null, current: null }, discarded: { previous: null, current: null },
    managedLabel: period === '주간' ? '이번주 관리 현황' : period === '월간' ? '이번달 관리 현황' : '이번년도 관리 현황', managedCount: registeredCount, consumptionRate: null, consumptionLabel: `${period} 소비율`,
  }])) as MyPageReports;
}

// 소비/폐기를 완료한 식재료 개수. 단위가 다른 수량을 합산하거나 등록 개수로 대신하지 않는다.
export function hasEnoughReportData(report: MyPageReport): boolean {
  return report.completedItemCount === undefined ? report.score !== null : report.completedItemCount >= 3;
}
