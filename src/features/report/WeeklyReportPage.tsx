import { CardShell } from '../../components/CardShell';
import { ReminderBanner } from '../../components/ReminderBanner';
import { SubHeader } from '../../components/SubHeader';
import { asset } from '../../lib/assets';
import { suggestionLines, type WeeklyReport } from './weeklyReport';
import type { ReportPeriod } from '../mypage/report';

// 아이콘은 한 장의 스프라이트(report-status.png)를 상태별로 잘라 쓴다 (Figma thumnail/stored·consumed·discarded)
const statuses = [
  { key: 'stored', label: '보관' },
  { key: 'consumed', label: '소비' },
  { key: 'discarded', label: '폐기' },
] as const;

function TopList({ title, items, tone }: { title: string; items: string[]; tone: 'consumed' | 'discarded' }) {
  return (
    <CardShell className={`weekly-report-top weekly-report-top-${tone}`}>
      <h3>{title}</h3>
      <ol>
        {[0, 1, 2].map(index => (
          <li key={index} className={items[index] ? undefined : 'weekly-report-top-empty'}><b>{index + 1}</b><span>{items[index] ?? '기록 없음'}</span></li>
        ))}
      </ol>
    </CardShell>
  );
}

// 마이페이지 대시보드의 '이번주 관리 현황'을 누르면 열리는 상세 화면 (Figma 3196:12098)
export function WeeklyReportPage({ report, period = '주간', onBack }: { report: WeeklyReport; period?: ReportPeriod; onBack: () => void }) {
  const [line1, line2] = suggestionLines(report, period);
  return (
    <main className="weekly-report" data-figma-node="3196:12098">
      <SubHeader title="냉장고 리포트" onBack={onBack} />
      <section className="fridge-summary weekly-report-summary">
        <h2>{period === '주간' ? '이번주 관리 현황' : period === '월간' ? '이번달 관리 현황' : '이번년도 관리 현황'}</h2>
        <CardShell>
          <div className="summary-grid">
            {statuses.map(status => (
              <div className="summary-item" key={status.key}>
                <span className={`weekly-report-icon weekly-report-icon-${status.key}`}><span><img src={asset('report-status.png')} alt="" /></span></span>
                <span className="storage-label">{status.label}</span>
                <b>{report[status.key]}개</b>
              </div>
            ))}
          </div>
        </CardShell>
        <TopList title="자주 소비한 식재료 TOP 3" items={report.topConsumed} tone="consumed" />
        <TopList title="자주 폐기한 식재료 TOP 3" items={report.topDiscarded} tone="discarded" />
      </section>
      <div className="weekly-report-banner">
        <ReminderBanner title="콕집서의 한 줄 제안" description={<>{line1}<br />{line2}</>} />
      </div>
    </main>
  );
}
