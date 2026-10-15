import { useState } from 'react';
import { OverlayDialog } from '../../components/OverlayDialog';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';

export function OverlayActions({ onCancel, onSave, save = '확인' }: { onCancel: () => void; onSave: () => void; save?: string }) {
  return <div className="overlay-actions"><button type="button" onClick={onCancel}>취소</button><ActionButton onClick={onSave}>{save}</ActionButton></div>;
}

export function DateOverlay({ value, onSave, onClose }: { value: string; onSave: (value: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(() => new Date(`${value}T12:00:00`));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const start = new Date(year, monthIndex, 1).getDay();
  function shiftMonth(delta: number) { setMonth(new Date(year, monthIndex + delta, 1)); }
  return <OverlayDialog label="촬영 날짜 선택" onClose={onClose} className="date-overlay">
    <div className="calendar" data-figma-node="5096:5586"><div className="calendar-header"><span>{year}년 {monthIndex + 1}월<img src={asset('calendar-expand.svg')} alt="" /></span><button aria-label="이전 달" onClick={() => shiftMonth(-1)}><img src={asset('calendar-prev.svg')} alt="" /></button><button aria-label="다음 달" onClick={() => shiftMonth(1)}><img src={asset('calendar-next.svg')} alt="" /></button></div><div className="calendar-weekdays">{['일','월','화','수','목','금','토'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({length:42}, (_, index) => {
      const day = new Date(year, monthIndex, index - start + 1);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      const outside = day.getMonth() !== monthIndex;
      return <button key={key} disabled={outside} aria-label={key} aria-pressed={key === draft} className={key === draft ? 'selected' : ''} onClick={() => setDraft(key)}>{day.getDate()}</button>;
    })}</div></div>
    <OverlayActions onCancel={onClose} onSave={() => onSave(draft)} />
  </OverlayDialog>;
}

function Wheel({ label, values, selected, onChange }: { label: string; values: string[]; selected: string; onChange: (value: string) => void }) {
  const index = values.indexOf(selected);
  return <div className="time-wheel" role="group" aria-label={label} onWheel={event => onChange(values[(index + (event.deltaY > 0 ? 1 : values.length - 1)) % values.length])}>
    {[-2,-1,0,1,2].map(offset => {
      const value = values[(index + offset + values.length) % values.length];
      return <button type="button" key={offset} className={offset === 0 ? 'chosen' : Math.abs(offset) === 2 ? 'distant' : ''} aria-label={`${label} ${value}`} aria-pressed={offset === 0} onClick={() => onChange(value)}>{value}</button>;
    })}
    <select className="accessible-time-select" aria-label={`${label} 직접 선택`} value={selected} onChange={event => onChange(event.target.value)}>{values.map(value => <option key={value}>{value}</option>)}</select>
  </div>;
}

export function TimeOverlay({ value, onSave, onClose }: { value: string; onSave: (value: string) => void; onClose: () => void }) {
  const [hour, setHour] = useState(String(Number(value.slice(0,2)) % 12 || 12));
  const [minute, setMinute] = useState(value.slice(3));
  const [period, setPeriod] = useState(Number(value.slice(0,2)) >= 12 ? 'PM' : 'AM');
  return <OverlayDialog label="촬영 시간 선택" onClose={onClose} className="time-overlay"><div className="time-picker" data-figma-node="5096:5585"><div className="time-highlight" /><Wheel label="시" values={Array.from({length:12},(_, i) => String(i + 1))} selected={hour} onChange={setHour} /><Wheel label="분" values={Array.from({length:60},(_, i) => String(i).padStart(2,'0'))} selected={minute} onChange={setMinute} /><div className="period-wheel"><button onClick={() => setPeriod(period === 'AM' ? 'PM' : 'AM')}>{period === 'AM' ? 'PM' : 'AM'}</button><select aria-label="오전 오후" value={period} onChange={event => setPeriod(event.target.value)}><option>AM</option><option>PM</option></select></div></div><OverlayActions onCancel={onClose} onSave={() => onSave(`${String(Number(hour) % 12 + (period === 'PM' ? 12 : 0)).padStart(2,'0')}:${minute}`)} /></OverlayDialog>;
}

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  const tips = [
    ['식재료는 조금 여유 있게 정해요','식재료는 식약처 공식 보관 기간의 80% 시점을 소비권장일로 정해요.  (예: 10일 → 8일)'],
    ['음식은 보관한 날부터 3일로 정해요','남은 배달 음식·반찬·조리 음식은 보관 시점부터 3일을 소비권장일로 적용해요.'],
    ['보관 상태에 따라 달라질 수 있어요','같은 식재료라도 보관 방법과 상태에 따라 먹을 수 있는 기간은 달라질 수 있어요.'],
  ];
  return <OverlayDialog label="안심 소비 안내" onClose={onClose} sheet dismissOutside={false} className="help-overlay"><div data-figma-node="5469:19213"><div className="sheet-handle" /><header><p>안심 소비 안내</p><h2>소비권장일, 어떻게 정하나요?</h2><span>식약처의 공식 보관 기준을 바탕으로 식재료와 음식에 맞는 기준을 적용해 자동으로 설정해드려요.</span></header><ol>{tips.map(([title,body],index) => <li key={title}><span>{index+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol><div className="help-actions"><ActionButton className="action-button-large" onClick={onClose}>확인했어요</ActionButton></div></div></OverlayDialog>;
}
