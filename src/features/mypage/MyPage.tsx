import { useState } from 'react';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';
import type { WeeklyReport } from '../report/weeklyReport';

import { MyPageDashboard } from './MyPageDashboard';

import { hasEnoughReportData, pendingReports, type MyPageReports } from './report';

const periods = ['주간', '월간', '전체'] as const;

export function MyPage({ navigate, registeredCount = 0, reports, error, report: weeklyReport }: { navigate: Navigate; registeredCount?: number; reports?: MyPageReports; error?: string; report?: WeeklyReport }) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('주간');

  const hasReport = Boolean(reports && Object.values(reports).some(value => value.managedCount > 0 || (value.completedItemCount ?? 0) > 0)) || registeredCount > 0 || Boolean(weeklyReport && (weeklyReport.consumed > 0 || weeklyReport.discarded > 0));
  const report = (reports ?? pendingReports(registeredCount))[period];
  // 아직 집계가 연결되지 않은 상태를 '완료 기록 0개'로 단정하지 않는다.
  const insufficient = hasReport && Boolean(reports) && !hasEnoughReportData(report);
  return (
    <main className={`mypage${insufficient ? ' mypage-insufficient' : ''}`} data-figma-node={insufficient ? '3061:13171' : hasReport ? '3061:12938' : '3061:13127'}>
      <div className="mypage-tabs" role="tablist" aria-label="리포트 기간">
        {periods.map(item => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={period === item}
            className={period === item ? 'selected' : ''}
            onClick={() => setPeriod(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}<button onClick={() => window.location.reload()}>다시 시도</button></p>}
      {hasReport ? <MyPageDashboard report={report} onOpenManaged={() => navigate('weekly-report')} /> : <><section className="mypage-empty-state" aria-label="신규 사용자 빈 상태">
        <img className="mypage-empty-illustration" src={asset('empty-fridge.png')} alt="" />
        <div className="mypage-empty-copy">
          <h2>아직 냉장고 리포트가 없어요</h2>
          <p>식재료를 등록하면 나만의 관리 리포트를 확인할 수 있어요</p>
          <div className="mypage-update-note"><span aria-hidden="true">◷</span>데이터는 매일 오전 6시에 업데이트돼요</div>
        </div>
      </section>
      <div className="mypage-buttons-section">
        <ActionButton className="mypage-register-button" onClick={() => navigate('registration')}>식재료 등록하기</ActionButton>
      </div></>}
    </main>
  );
}
