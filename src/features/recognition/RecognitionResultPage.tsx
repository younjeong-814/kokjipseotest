import { SubHeader } from '../../components/SubHeader';
import { ReminderBanner } from '../../components/ReminderBanner';
import { CardShell } from '../../components/CardShell';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';
import { recognizedItems, type useRecognition } from './useRecognition';

type Props = { navigate: Navigate; recognition: ReturnType<typeof useRecognition> };

export function RecognitionResultPage({ navigate, recognition }: Props) {
  return (
    <main className="recognition-result" data-figma-node="5572:19525" data-editing={recognition.editing} data-pending-name={recognition.pendingName}>
      <SubHeader title="인식 결과 확인" backIcon="ai-back.svg" onBack={() => window.history.back()} />
      <div className="recognition-content">
        <section className="capture-date"><div className="capture-date-row"><div><b>8월 8일 토</b><span>수정</span></div><div><b>오전 10:49</b><span>수정</span></div></div><p>촬영한 날짜와 시간을 확인해 주세요.</p></section>
        <section className="recognition-banner"><ReminderBanner /></section>
        <section className="recognized-list" aria-label="AI 인식 식재료">
          {recognizedItems.map(item => <div className="recognized-slot" key={item.id}>
            {recognition.visible[item.id] && <div className="recognized-row" data-item-id={item.id}>
              <img className={`recognized-thumbnail${item.vegetable ? ' vegetable' : ''}`} src={asset(item.image)} alt="" />
              <div className="recognized-name"><h2>{item.name}</h2>{item.error && <span className="recognition-error"><img src={asset('ai-error.svg')} alt="" />인식오류</span>}</div>
              <div className="recognized-actions"><button type="button" aria-label={`${item.name} 수정`} onClick={() => recognition.selectEdit(item.id)}><img src={asset('ai-edit.png')} alt="" /></button><button type="button" aria-label={`${item.name} 삭제`} onClick={() => recognition.remove(item.id)}><img src={asset('ai-close.png')} alt="" /></button></div>
            </div>}
            <div className="recognition-divider" />
          </div>)}
        </section>
        <section className="recognition-guideline"><CardShell className="recognition-guideline-card"><div className="guideline-heading"><h2>소비권장일, 어떻게 정하나요?</h2><span className="recognition-help"><img src={asset('ai-help.svg')} alt="" /></span></div><p>소비권장일을 정하기 어렵다면 식약처 기준을 바탕으로<br />콕집서가 소비권장일을 자동으로 설정해드려요.</p></CardShell></section>
        <div className="recognition-footer"><ActionButton className="action-button-large recognition-retake" onClick={() => navigate('5579:702')}>재촬영</ActionButton><ActionButton className="action-button-large" onClick={() => navigate('5572:19852')}>등록</ActionButton></div>
      </div>
    </main>
  );
}

