import { useState } from 'react';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';
import { CardShell } from '../../components/CardShell';
import type { WeeklyReport } from '../report/weeklyReport';

const periods = ['주간', '월간', '전체'] as const;

export function MyPage({ navigate, report }: { navigate: Navigate; report: WeeklyReport }) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('주간');

  return (
    <main className="mypage" data-figma-node="3061:13127">
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
      {/* 임시 진입점: 마이페이지 대시보드가 완성되면 대시보드의 '이번주 관리 현황'으로 교체 */}
      <button type="button" className="mypage-report-entry" onClick={() => navigate('weekly-report')}>
        <span className="mypage-report-entry-title">이번주 관리 현황 <span aria-hidden="true">›</span></span>
        <CardShell className="mypage-report-entry-card">
          <span>보관 <b>{report.stored}개</b></span>
          <span>소비 <b>{report.consumed}개</b></span>
          <span>폐기 <b>{report.discarded}개</b></span>
        </CardShell>
      </button>
      <section className="mypage-empty-state" aria-label="신규 사용자 빈 상태">
        <img className="mypage-empty-illustration" src={asset('empty-fridge.png')} alt="" />
        <div className="mypage-empty-copy">
          <h2>아직 냉장고 리포트가 없어요</h2>
          <p>식재료를 등록하면 나만의 관리 리포트를 확인할 수 있어요</p>
          <div className="mypage-update-note"><span aria-hidden="true">◷</span>데이터는 매일 오전 6시에 업데이트돼요</div>
        </div>
      </section>
      <div className="mypage-buttons-section">
        <ActionButton className="mypage-register-button" onClick={() => navigate('registration')}>식재료 등록하기</ActionButton>
      </div>
    </main>
  );
}
