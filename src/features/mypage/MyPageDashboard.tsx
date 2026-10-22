import type { CSSProperties } from 'react';
import { CardShell } from '../../components/CardShell';
import { asset } from '../../lib/assets';
import type { MyPageReport } from './report';

const valueText = (value: number | null) => value === null ? '—' : String(value);
const percent = (value: number | null) => Math.max(0, Math.min(100, value ?? 0));
function Comparison({ title, values, report, waste = false }: { title: string; values: MyPageReport['consumed']; report: MyPageReport; waste?: boolean }) {
  const max = Math.max(values.previous ?? 0, values.current ?? 0, 1);
  return <CardShell className="mypage-comparison"><h3>{title}</h3><div className="mypage-bars">{([['previous',report.previousLabel],['current',report.currentLabel]] as const).map(([key,label]) => <div className="mypage-bar-column" key={key}><div className={`mypage-bar ${key}${waste ? ' waste' : ''}${values[key] === null ? ' pending' : ''}`} style={{height: values[key] === null ? 32 : Math.max(30, (values[key]! / max) * 100)}}><span>{valueText(values[key])}</span></div><p>{label}</p></div>)}</div></CardShell>;
}
export function MyPageDashboard({ report, onOpenManaged }: { report: MyPageReport; onOpenManaged: () => void }) {
  return <section className="mypage-dashboard" aria-label="냉장고 관리 리포트">
    <CardShell className="mypage-score-card"><div className="mypage-score-copy"><p>{report.scoreLabel}</p><h2>{valueText(report.score)}{report.score !== null && '점'}</h2><strong>{report.grade}</strong>{report.scoreChange && <small>{report.scoreChange}</small>}</div>
      <div className="mypage-score-chart" role="img" aria-label={report.score === null ? '관리 점수 집계 중' : `관리 점수 ${report.score}점, 100점 만점`}>
        <div className="mypage-live-ring" style={{'--progress':`${percent(report.score)}%`} as CSSProperties}/>
        <b>{valueText(report.score)}</b><span>/100</span>
      </div>
    </CardShell>
    {report.feedbackTitle && <CardShell className="mypage-feedback"><div className="mypage-feedback-icon"><img src={asset('mypage-feedback.png')} alt=""/></div><div><strong>{report.feedbackTitle}</strong><p>{report.feedbackDescription}</p></div></CardShell>}
    <div className="mypage-comparisons"><Comparison title="소비량 비교" values={report.consumed} report={report}/><Comparison title="폐기량 비교" values={report.discarded} report={report} waste/></div>
    <button className="mypage-managed" onClick={onOpenManaged}><strong>{report.managedLabel}</strong><span>{report.managedCount} 개<img src={asset('mypage-chevron.svg')} alt=""/></span></button>
    <CardShell className="mypage-consumption"><p>등록한 식재료 중<br/><strong>{report.consumptionRate === null ? '집계 중' : `${Math.round(report.consumptionRate)}%`}</strong>{report.consumptionRate !== null && '를 소비했어요'}</p>
      <div className="mypage-half-chart" role="img" aria-label={report.consumptionRate === null ? '소비율 집계 중' : `${report.consumptionLabel} ${report.consumptionRate}%`}>
        <div className="mypage-live-half"><div style={{'--progress':`${percent(report.consumptionRate) / 2}%`} as CSSProperties}/></div>
        <b>{report.consumptionRate === null ? '—' : `${Math.round(report.consumptionRate)}%`}</b><span>{report.consumptionLabel}</span>
      </div>
    </CardShell>
  </section>;
}
