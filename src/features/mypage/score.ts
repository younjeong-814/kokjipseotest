export function managementScore(consumptionRate: number | null, managementRate: number | null): number | null {
  if (consumptionRate === null || managementRate === null || ![consumptionRate, managementRate].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) return null;
  return Math.round(consumptionRate * 0.7 + managementRate * 0.3);
}
export function managementGrade(score: number | null): string {
  if (score === null) return '분석 데이터가 쌓이면 제공해 드릴게요';
  if (score >= 90) return '냉장고 관리 달인 Master';
  if (score >= 75) return '알뜰한 냉장고 Pro';
  if (score >= 60) return '차곡차곡 관리 중';
  if (score >= 40) return '냉장고 살펴보는 중';
  return '관리 시작 단계';
}
