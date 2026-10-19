import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useFridgeSort } from '../fridge/useFridgeSort';

import { FridgeTabs } from '../fridge/FridgeTabs';
import { FridgeFilters } from '../fridge/FridgeFilters';
import { IngredientCard } from './IngredientCard';
import type { Navigate } from '../../prototype/flow';
import type { Ingredient } from './repository';
import { sortIngredients } from '../fridge/sorting';
import { asset } from '../../lib/assets';

export function StoredIngredientsPage({ navigate, items, onOpen, onDelete, registered = false, food = false }: { navigate: Navigate; items: Ingredient[]; onOpen: (item: Ingredient) => void; onDelete: (id: string) => void; registered?: boolean; food?: boolean }) {
  const { sort, direction, onChange } = useFridgeSort();
  const [openItem, setOpenItem] = useState<string | null>(null);
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const suppressDeleteClick = useRef(false);
  const sorted = sortIngredients(items, { sort, direction });
  const onRowPointerDown = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (!(event.target instanceof Element && event.target.closest('.registered-delete-action'))) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    drag.current = { id, x: event.clientX, y: event.clientY, moved: false };
  };
  const onRowPointerMove = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    const start = drag.current;
    if (!start || start.id !== id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) start.moved = true;
    if (start.moved) {
      const card = event.currentTarget.querySelector<HTMLElement>('.ingredient-card-trigger');
      card?.style.setProperty('--delete-drag', `${Math.max(-39, Math.min(0, (openItem === id ? -39 : 0) + dx))}px`);
    }
  };
  const onRowPointerUp = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    const start = drag.current;
    if (!start || start.id !== id) return;
    const dx = event.clientX - start.x;
    if (start.moved) {
      event.currentTarget.querySelector<HTMLElement>('.ingredient-card-trigger')?.style.removeProperty('--delete-drag');
      if (dx < -18) setOpenItem(id);
      else if (dx > 10) setOpenItem(null);
      if (Math.abs(dx) > 10) {
        suppressDeleteClick.current = true;
        // Pointer-generated click follows pointerup immediately; keep the guard
        // short so a deliberate tap right after a swipe still opens the detail.
        window.setTimeout(() => { suppressDeleteClick.current = false; }, 80);
      }
    }
    drag.current = null;
  };
  const onRowPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.querySelector<HTMLElement>('.ingredient-card-trigger')?.style.removeProperty('--delete-drag');
    drag.current = null;
  };
  const onRowClick = (event: ReactMouseEvent<HTMLDivElement>, item: Ingredient) => {
    if (event.target instanceof Element && event.target.closest('.registered-delete-action')) return;
    if (suppressDeleteClick.current) {
      suppressDeleteClick.current = false;
      event.preventDefault();
      return;
    }
    onOpen(item);
  };
  return <main className="fridge-page">
    <FridgeTabs food={food} navigate={navigate} /><FridgeFilters value={sort} direction={direction} onChange={onChange} />
    <section className="registered-fridge-list stored-ingredients" aria-label={sort ? `${sort} ${direction === 'asc' ? '오름차순' : '내림차순'} 식재료 목록` : '식재료 목록'}>{sorted.map(item => <div className={`stored-ingredient-row${openItem === item.id ? ' is-delete-open' : ''}`} key={item.id} onPointerDown={event => onRowPointerDown(event, item.id)} onPointerMove={event => onRowPointerMove(event, item.id)} onPointerUp={event => onRowPointerUp(event, item.id)} onPointerCancel={onRowPointerCancel} onClick={event => onRowClick(event, item)}>
      <button type="button" className="registered-delete-action" aria-label={`${item.name} 삭제`} onClick={event => {
        if (suppressDeleteClick.current) {
          suppressDeleteClick.current = false;
          event.preventDefault();
          return;
        }
        onDelete(item.id);
        setOpenItem(null);
      }}><img src={asset('delete-action.svg')} alt="" /></button>
      <IngredientCard item={item} onOpen={() => {}} />
    </div>)}</section>
  </main>;
}
