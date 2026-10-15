import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { SubHeader } from '../../components/SubHeader';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import { formatMonthDay } from '../../lib/date';
import { DateOverlay, HelpOverlay } from '../recognition/RecognitionOverlays';
import type { Navigate } from '../../prototype/flow';

function EntryInput({ label, value, clearable = false, onClear, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; clearable?: boolean; onClear?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <label className="manual-field"><span>{label}</span><div className={`manual-input${value ? ' filled' : ''}`}><input {...props} aria-label={label} ref={input} value={value} />{clearable && value && <button type="button" aria-label={`${label} 지우기`} onMouseDown={event => event.preventDefault()} onClick={() => { onClear?.(); input.current?.focus(); }}><img src={asset('manual-close.svg')} alt="" /></button>}</div></label>;
}

function ChoiceChips({ label, options, value, onChange, large = false }: { label: string; options: readonly string[]; value: string; onChange: (value: string) => void; large?: boolean }) {
  return <fieldset className={`manual-choices${large ? ' storage' : ''}`}><legend>{label}</legend><div>{options.map(option => <button type="button" key={option} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}</div></fieldset>;
}

function UnitPicker() {
  const [unit, setUnit] = useState('개');
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return <div className="manual-unit" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1) + buttons.length) % buttons.length]?.focus();
    }
  }}>
    {custom ? <input autoFocus aria-label="수량 단위 직접입력" maxLength={10} value={unit} onChange={event => setUnit(event.target.value)} /> : null}
    <button ref={trigger} type="button" aria-label="수량 단위 선택" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>{custom ? '' : unit}<span><img src={asset('manual-expand.svg')} alt="" /></span></button>
    {open && <div className="manual-unit-menu" role="listbox" aria-label="수량 단위">{['개','g','ml','kg','직접입력'].map(option => <button type="button" role="option" key={option} aria-selected={custom ? option === '직접입력' : option === unit} onClick={() => { setCustom(option === '직접입력'); setUnit(option === '직접입력' ? '' : option); setOpen(false); if (option !== '직접입력') trigger.current?.focus(); }}>{option}</button>)}</div>}
  </div>;
}

export function ManualEntryPage({ navigate }: { navigate: Navigate }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [storage, setStorage] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  return <main className="manual-entry" data-figma-node="5733:5582">
    <SubHeader title="직접 입력" backIcon="manual-back.svg" onBack={() => navigate('registration')} />
    <div className="manual-fields">
      <EntryInput label="재료명" placeholder="예: 돼지고기, 시금치, 계란..." value={name} onChange={event => setName(event.target.value)} clearable onClear={() => setName('')} maxLength={60} autoComplete="off" />
      <ChoiceChips label="카테고리" options={['육류','과일','채소','두부·콩류','유제품','수산물','조미료','가공식품','기타']} value={category} onChange={setCategory} />
      <ChoiceChips label="보관 위치" options={['냉장','냉동','실온']} value={storage} onChange={setStorage} large />
      <div className="manual-quantity"><label htmlFor="manual-quantity">수량</label><div><EntryInput label="수량" id="manual-quantity" type="number" inputMode="decimal" min="0.01" step="any" placeholder="1" value={quantity} onChange={event => setQuantity(event.target.value)} /><UnitPicker /></div></div>
      <div className="manual-date"><div className="manual-field"><span>소비 권장일</span><button type="button" className={`manual-input manual-date-button${date ? ' filled' : ''}`} aria-label={`소비 권장일 ${date ? formatMonthDay(date) : '선택'}`} onClick={() => setDateOpen(true)}>{date ? formatMonthDay(date) : <span className="manual-placeholder">날짜 선택</span>}</button></div><button type="button" className="manual-help" aria-label="소비 권장일 안내" onClick={() => setHelpOpen(true)}><img src={asset('manual-help.svg')} alt="" /></button></div>
    </div>
    {dateOpen && <DateOverlay label="소비 권장일 선택" value={date} onClose={() => setDateOpen(false)} onSave={value => { setDate(value); setDateOpen(false); }} />}
    {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
    <div className="manual-submit"><ActionButton type="button" className="action-button-large" onClick={() => navigate('fridge-registered')}>냉장고에 등록하기</ActionButton></div>
  </main>;
}
