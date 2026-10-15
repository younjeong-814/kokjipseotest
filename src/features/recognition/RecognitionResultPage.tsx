import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { DateOverlay, TimeOverlay, HelpOverlay } from './RecognitionOverlays';
import { SubHeader } from '../../components/SubHeader';
import { ReminderBanner } from '../../components/ReminderBanner';
import { CardShell } from '../../components/CardShell';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';
import { recognizedItems, type useRecognition } from './useRecognition';

type Props = { navigate: Navigate; recognition: ReturnType<typeof useRecognition> };

export function RecognitionResultPage({ navigate, recognition }: Props) {
  const [overlay, setOverlay] = useState<{ kind: 'date' | 'time' | 'help' } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const nameInputs = useRef<(HTMLInputElement | null)[]>([]);
  const finishName = (id: number) => {
    if (editingId !== id) return;
    recognition.saveName(id, draftName);
    setEditingId(null);
  };
  const editName = (id: number) => {
    recognition.selectEdit(id);
    flushSync(() => { setDraftName(recognition.names[id]); setEditingId(id); });
    nameInputs.current[id]?.focus();
    nameInputs.current[id]?.select();
  };
  const close = () => setOverlay(null);
  const date = new Date(`${recognition.date}T12:00:00`);
  const dateLabel = `${date.getMonth() + 1}월 ${date.getDate()}일 ${['일','월','화','수','목','금','토'][date.getDay()]}`;
  const hour = Number(recognition.time.slice(0,2));
  const timeLabel = `${hour >= 12 ? '오후' : '오전'} ${hour % 12 || 12}:${recognition.time.slice(3)}`;
  return (
    <main className="recognition-result" data-figma-node="5572:19525" data-editing={recognition.editing} data-pending-name={recognition.pendingName}>
      <SubHeader title="인식 결과 확인" backIcon="ai-back.svg" onBack={() => window.history.back()} />
      <div className="recognition-content">
        <section className="capture-date"><div className="capture-date-row"><button type="button" aria-label="촬영 날짜 수정" onClick={() => setOverlay({kind: 'date'})}><b>{dateLabel}</b><span>수정</span></button><button type="button" aria-label="촬영 시간 수정" onClick={() => setOverlay({kind: 'time'})}><b>{timeLabel}</b><span>수정</span></button></div><p>촬영한 날짜와 시간을 확인해 주세요.</p></section>
        <section className="recognition-banner"><ReminderBanner /></section>
        <section className="recognized-list" aria-label="AI 인식 식재료">
          {recognizedItems.map(item => <div className="recognized-slot" key={item.id}>
            {recognition.visible[item.id] && <div className="recognized-row" data-item-id={item.id}>
              <img className={`recognized-thumbnail${item.vegetable ? ' vegetable' : ''}`} src={asset(item.image)} alt="" />
              <div className="recognized-name"><input ref={element => { nameInputs.current[item.id] = element; }} className="recognized-name-input" aria-label={`${recognition.names[item.id]} 이름`} readOnly={editingId !== item.id} tabIndex={editingId === item.id ? 0 : -1} value={editingId === item.id ? draftName : recognition.names[item.id]} maxLength={60} enterKeyHint="done" onChange={event => setDraftName(event.target.value)} onBlur={() => finishName(item.id)} onKeyDown={event => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  flushSync(() => setEditingId(null));
                  event.currentTarget.blur();
                }
              }} />{item.error && !recognition.corrected[item.id] && <span className="recognition-error"><img src={asset('ai-error.svg')} alt="" />인식오류</span>}</div>
              <div className="recognized-actions"><button type="button" aria-label={`${recognition.names[item.id]} 수정`} onClick={() => editName(item.id)}><img src={asset('ai-edit.png')} alt="" /></button><button type="button" aria-label={`${recognition.names[item.id]} 삭제`} onClick={() => recognition.remove(item.id)}><img src={asset('ai-close.png')} alt="" /></button></div>
            </div>}
            <div className="recognition-divider" />
          </div>)}
        </section>
        <section className="recognition-guideline"><button className="recognition-help-trigger" aria-label="소비권장일 안내" onClick={() => setOverlay({kind: 'help'})}><CardShell className="recognition-guideline-card"><div className="guideline-heading"><h2>소비권장일, 어떻게 정하나요?</h2><span className="recognition-help"><img src={asset('ai-help.svg')} alt="" /></span></div><p>소비권장일을 정하기 어렵다면 식약처 기준을 바탕으로<br />콕집서가 소비권장일을 자동으로 설정해드려요.</p></CardShell></button></section>
        <div className="recognition-footer"><ActionButton className="action-button-large recognition-retake" onClick={() => navigate('5579:702')}>재촬영</ActionButton><ActionButton className="action-button-large" onClick={() => navigate('5572:19852')}>등록</ActionButton></div>
      </div>
      {overlay?.kind === 'date' && <DateOverlay value={recognition.date} onClose={close} onSave={value => { recognition.setDate(value); close(); }} />}
      {overlay?.kind === 'time' && <TimeOverlay value={recognition.time} onClose={close} onSave={value => { recognition.setTime(value); close(); }} />}
      {overlay?.kind === 'help' && <HelpOverlay onClose={close} />}
    </main>
  );
}
