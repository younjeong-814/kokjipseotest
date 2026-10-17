import { useState } from 'react';
import { OverlayDialog } from '../../components/OverlayDialog';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Ingredient } from './repository';

export type IngredientInfoPatch = { name: string; quantity?: number; unit?: string };
const units = ['개', 'g', 'ml', 'kg'];

export function IngredientEditModal({ item, quantityLocked, onClose, onSave }: { item: Ingredient; quantityLocked: boolean; onClose: () => void; onSave: (patch: IngredientInfoPatch) => void }) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [custom, setCustom] = useState(!units.includes(item.unit));
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  return <OverlayDialog label="식재료 정보 수정" className="ingredient-edit-modal" onClose={onClose}>
    <form data-figma-node={quantityLocked ? '5807:6314' : '5833:21385'} onClick={event => { if (!(event.target as Element).closest('.ingredient-unit-picker')) setExpanded(false); }} onSubmit={event => {
      event.preventDefault();
      if (!name.trim() || name.trim().length > 60) { setError('재료명을 1~60자로 입력해 주세요.'); return; }
      if (!quantityLocked && (!quantity.trim() || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || !unit.trim() || unit.trim().length > 10)) { setError('수량과 단위를 확인해 주세요.'); return; }
      try { onSave(quantityLocked ? { name: name.trim() } : { name: name.trim(), quantity: Number(quantity), unit: unit.trim() }); onClose(); }
      catch (failure) { setError(failure instanceof Error ? failure.message : '저장하지 못했어요.'); }
    }}>
      <header><div><h2>식재료 정보 수정</h2><p>재료명과 수량을 확인하고 수정해 주세요.</p></div><button type="button" aria-label="수정 창 닫기" onClick={onClose}><img src={asset('ingredient-edit-close.svg')} alt="" /></button></header>
      <label className="ingredient-edit-field">재료명<input aria-label="재료명" value={name} maxLength={60} placeholder="예: 돼지고기, 시금치, 계란..." onChange={event => setName(event.target.value)} /></label>
      <div className="ingredient-edit-field"><label htmlFor="detail-edit-quantity">수량</label>{quantityLocked ? <input id="detail-edit-quantity" disabled value={`${item.quantity}${item.unit}`} /> : <div className="ingredient-edit-quantity"><input id="detail-edit-quantity" type="number" min="0" step="any" inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} /><div className="ingredient-unit-picker" onKeyDown={event => { if (event.key === 'Escape' && expanded) { event.preventDefault(); event.stopPropagation(); setExpanded(false); } }}><button type="button" aria-label="수량 단위 선택" aria-haspopup="listbox" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{custom ? '직접입력' : unit}<span><img src={asset('ingredient-unit-expand.svg')} alt="" /></span></button>{expanded && <div role="listbox" aria-label="수량 단위" className="ingredient-unit-menu">{[...units, '직접입력'].map(value => <button key={value} type="button" role="option" aria-selected={value === (custom ? '직접입력' : unit)} onClick={() => { setCustom(value === '직접입력'); if (value !== '직접입력') setUnit(value); setExpanded(false); }}>{value}</button>)}</div>}</div></div>}{!quantityLocked && custom && <input aria-label="직접입력 단위" maxLength={10} value={unit} placeholder="단위를 입력해 주세요" onChange={event => setUnit(event.target.value)} />}</div>
      {error && <p role="alert" className="ingredient-error">{error}</p>}
      <footer><ActionButton type="button" className="ingredient-edit-cancel action-button-large" onClick={onClose}>취소</ActionButton><ActionButton type="submit" className="action-button-large">저장</ActionButton></footer>
    </form>
  </OverlayDialog>;
}
