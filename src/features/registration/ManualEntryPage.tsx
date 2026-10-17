import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { SubHeader } from '../../components/SubHeader';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import { formatMonthDay } from '../../lib/date';
import { DateOverlay, HelpOverlay } from '../recognition/RecognitionOverlays';
import type { Navigate } from '../../prototype/flow';
import { categories, storageLocations, validateDraft, type Ingredient, type IngredientDraft } from '../ingredients/repository';

function EntryInput({ label, value, clearable = false, onClear, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; clearable?: boolean; onClear?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <label className="manual-field"><span>{label}</span><div className={`manual-input${value ? ' filled' : ''}`}><input {...props} aria-label={label} ref={input} value={value} />{clearable && value && <button type="button" aria-label={`${label} 지우기`} onMouseDown={event => event.preventDefault()} onClick={() => { onClear?.(); input.current?.focus(); }}><img src={asset('manual-close.svg')} alt="" /></button>}</div></label>;
}

function ChoiceChips({ label, options, value, onChange, large = false }: { label: string; options: readonly string[]; value: string; onChange: (value: string) => void; large?: boolean }) {
  return <fieldset className={`manual-choices${large ? ' storage' : ''}`}><legend>{label}</legend><div>{options.map(option => <button type="button" key={option} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}</div></fieldset>;
}

function UnitPicker({ unit, setUnit }: { unit: string; setUnit: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(!['개','g','ml','kg'].includes(unit));
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

export function ManualEntryPage({ navigate, initial, onSave }: { navigate: Navigate; initial?: Ingredient; onSave: (draft: IngredientDraft, id?: string) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [storage, setStorage] = useState(initial?.storage ?? '');
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [unit, setUnit] = useState(initial?.unit ?? '개');
  const [date, setDate] = useState(initial?.date ?? '');
  const [error, setError] = useState('');
  const saving = useRef(false);
  const submit = () => {
    if (saving.current) return;
    const draft = { name, category, storage, quantity: Number(quantity), unit, date };
    const invalid = validateDraft(draft);
    if (invalid) { setError(invalid); return; }
    try { saving.current = true; onSave(draft, initial?.id); }
    catch (failure) { saving.current = false; setError(failure instanceof Error ? failure.message : '저장하지 못했어요. 다시 시도해 주세요.'); }
  };
  const [dateOpen, setDateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  return <main className="manual-entry" data-figma-node="5733:5582">
    <SubHeader title={initial ? '식재료 수정' : '직접 입력'} backIcon="manual-back.svg" onBack={() => navigate(initial ? 'fridge-registered' : 'registration')} />
    <div className="manual-fields">
      <EntryInput label="재료명" placeholder="예: 돼지고기, 시금치, 계란..." value={name} onChange={event => setName(event.target.value)} clearable onClear={() => setName('')} maxLength={60} autoComplete="off" />
      <ChoiceChips label="카테고리" options={categories} value={category} onChange={setCategory} />
      <ChoiceChips label="보관 위치" options={storageLocations} value={storage} onChange={setStorage} large />
      <div className="manual-quantity"><label htmlFor="manual-quantity">수량</label><div><EntryInput label="수량" id="manual-quantity" type="number" inputMode="decimal" min="0.01" step="any" placeholder="1" value={quantity} onChange={event => setQuantity(event.target.value)} /><UnitPicker unit={unit} setUnit={setUnit} /></div></div>
      <div className="manual-date"><div className="manual-field"><span>소비 권장일</span><button type="button" className={`manual-input manual-date-button${date ? ' filled' : ''}`} aria-label={`소비 권장일 ${date ? formatMonthDay(date) : '선택'}`} onClick={() => setDateOpen(true)}>{date ? formatMonthDay(date) : <span className="manual-placeholder">날짜 선택</span>}</button></div><button type="button" className="manual-help" aria-label="소비 권장일 안내" onClick={() => setHelpOpen(true)}><img src={asset('manual-help.svg')} alt="" /></button></div>
    </div>
    {dateOpen && <DateOverlay label="소비 권장일 선택" value={date} onClose={() => setDateOpen(false)} onSave={value => { setDate(value); setDateOpen(false); }} />}
    {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
    {error && <p className="ingredient-error" role="alert">{error}</p>}
    <div className="manual-submit"><ActionButton type="button" className="action-button-large" onClick={submit}>{initial ? '수정 내용 저장하기' : '냉장고에 등록하기'}</ActionButton></div>
  </main>;
}
