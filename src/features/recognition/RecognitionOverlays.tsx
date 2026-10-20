import { useEffect, useRef, useState } from 'react';
import { OverlayDialog } from '../../components/OverlayDialog';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import { toDateKey } from '../../lib/date';

export function OverlayActions({ onCancel, onSave, save = '확인' }: { onCancel: () => void; onSave: () => void; save?: string }) {
  return <div className="overlay-actions"><button type="button" onClick={onCancel}>취소</button><ActionButton onClick={onSave}>{save}</ActionButton></div>;
}

export function DateOverlay({ value, onSave, onClose, label = '촬영 날짜 선택' }: { value: string; onSave: (value: string) => void; onClose: () => void; label?: string }) {
  // 값이 비어 있으면(직접 입력의 소비 권장일 등) 오늘 날짜로 시작한다.
  const [draft, setDraft] = useState(() => value || toDateKey(new Date()));
  const [month, setMonth] = useState(() => new Date(`${draft}T12:00:00`));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const start = new Date(year, monthIndex, 1).getDay();
  // 달 옆 화살표를 누르면 날짜 대신 1~12월 목록을 보여 준다. 이때 좌우 화살표는 연도를 바꾼다.
  const [picking, setPicking] = useState(false);
  function shiftMonth(delta: number) { setMonth(new Date(year, monthIndex + delta * (picking ? 12 : 1), 1)); }
  function pickMonth(index: number) { setMonth(new Date(year, index, 1)); setPicking(false); }
  return <OverlayDialog label={label} onClose={onClose} className="date-overlay">
    <div className="calendar" data-figma-node="5096:5586"><div className="calendar-header"><button type="button" className={`calendar-title${picking ? ' expanded' : ''}`} aria-expanded={picking} aria-label={`${year}년 ${monthIndex + 1}월, ${picking ? '날짜 보기' : '월 선택'}`} onClick={() => setPicking(!picking)}>{year}년 {monthIndex + 1}월<img src={asset('calendar-expand.svg')} alt="" /></button><button type="button" aria-label={picking ? '이전 해' : '이전 달'} onClick={() => shiftMonth(-1)}><img src={asset('calendar-prev.svg')} alt="" /></button><button type="button" aria-label={picking ? '다음 해' : '다음 달'} onClick={() => shiftMonth(1)}><img src={asset('calendar-next.svg')} alt="" /></button></div>
      {picking
        ? <div className="calendar-months">{Array.from({ length: 12 }, (_, index) => <button type="button" key={index} aria-pressed={index === monthIndex} className={index === monthIndex ? 'selected' : ''} onClick={() => pickMonth(index)}>{index + 1}월</button>)}</div>
        : <><div className="calendar-weekdays">{['일','월','화','수','목','금','토'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({length:42}, (_, index) => {
          const day = new Date(year, monthIndex, index - start + 1);
          const key = toDateKey(day);
          const outside = day.getMonth() !== monthIndex;
          return <button key={key} disabled={outside} aria-label={key} aria-pressed={key === draft} className={key === draft ? 'selected' : ''} onClick={() => setDraft(key)}>{day.getDate()}</button>;
        })}</div></>}</div>
    <OverlayActions onCancel={onClose} onSave={() => onSave(draft)} />
  </OverlayDialog>;
}

const WHEEL_ITEM_HEIGHT = 38;

/** 스크롤 + scroll-snap 휠. 손가락으로 튕기거나 마우스 휠로 굴리면 가운데 칸 값이 선택된다. */
function Wheel({ label, values, selected, onChange }: { label: string; values: string[]; selected: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrolledIndex = useRef<number>(undefined);
  const index = values.indexOf(selected);
  // 처음 열릴 때나 키보드(select)로 값이 바뀌었을 때만 해당 칸으로 이동한다. 스크롤로 바뀐 값은 건드리지 않는다.
  useEffect(() => {
    if (scrolledIndex.current !== index) ref.current?.scrollTo({ top: index * WHEEL_ITEM_HEIGHT });
  }, [index]);
  const onScroll = () => {
    const current = Math.min(values.length - 1, Math.max(0, Math.round(ref.current!.scrollTop / WHEEL_ITEM_HEIGHT)));
    scrolledIndex.current = current;
    if (current !== index) onChange(values[current]);
  };
  return <div className="time-column">
    <div ref={ref} className="time-wheel" role="group" aria-label={label} onScroll={onScroll}>
      {values.map((value, i) => {
        const distance = Math.abs(i - index);
        return <button type="button" key={value} tabIndex={-1} className={distance === 0 ? 'chosen' : distance >= 2 ? 'distant' : ''} aria-label={`${label} ${value}`} aria-pressed={distance === 0} onClick={() => ref.current?.scrollTo({ top: i * WHEEL_ITEM_HEIGHT, behavior: 'smooth' })}>{value}</button>;
      })}
    </div>
    <select className="accessible-time-select" aria-label={`${label} 직접 선택`} value={selected} onChange={event => onChange(event.target.value)}>{values.map(value => <option key={value}>{value}</option>)}</select>
  </div>;
}

export function TimeOverlay({ value, onSave, onClose }: { value: string; onSave: (value: string) => void; onClose: () => void }) {
  const [hour, setHour] = useState(String(Number(value.slice(0,2)) % 12 || 12));
  const [minute, setMinute] = useState(value.slice(3));
  const [period, setPeriod] = useState(Number(value.slice(0,2)) >= 12 ? 'PM' : 'AM');
  return <OverlayDialog label="촬영 시간 선택" onClose={onClose} className="time-overlay"><div className="time-picker" data-figma-node="5096:5585"><div className="time-highlight" /><Wheel label="시" values={Array.from({length:12},(_, i) => String(i + 1))} selected={hour} onChange={setHour} /><Wheel label="분" values={Array.from({length:60},(_, i) => String(i).padStart(2,'0'))} selected={minute} onChange={setMinute} /><Wheel label="오전 오후" values={['AM','PM']} selected={period} onChange={setPeriod} /></div><OverlayActions onCancel={onClose} onSave={() => onSave(`${String(Number(hour) % 12 + (period === 'PM' ? 12 : 0)).padStart(2,'0')}:${minute}`)} /></OverlayDialog>;
}

export function HelpOverlay({ onClose, figmaNode = '5469:19213' }: { onClose: () => void; figmaNode?: string }) {
  const tips = [
    ['식재료는 조금 여유 있게 정해요','식재료는 식약처 공식 보관 기간의 80% 시점을 소비권장일로 정해요.  (예: 10일 → 8일)'],
    ['음식은 보관한 날부터 3일로 정해요','남은 배달 음식·반찬·조리 음식은 보관 시점부터 3일을 소비권장일로 적용해요.'],
    ['보관 상태에 따라 달라질 수 있어요','같은 식재료라도 보관 방법과 상태에 따라 먹을 수 있는 기간은 달라질 수 있어요.'],
  ];
  return <OverlayDialog label="안심 소비 안내" onClose={onClose} sheet dismissOutside={false} className="help-overlay"><div data-figma-node={figmaNode}><div className="sheet-handle" /><header><p>안심 소비 안내</p><h2>소비권장일, 어떻게 정하나요?</h2><span>식약처의 공식 보관 기준을 바탕으로 식재료와 음식에 맞는 기준을 적용해 자동으로 설정해드려요.</span></header><ol>{tips.map(([title,body],index) => <li key={title}><span>{index+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol><div className="help-actions"><ActionButton className="action-button-large" onClick={onClose}>확인했어요</ActionButton></div></div></OverlayDialog>;
}
