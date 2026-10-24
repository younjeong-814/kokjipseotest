import { Fragment, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useFridgeSort } from '../fridge/useFridgeSort';

import { FridgeTabs } from '../fridge/FridgeTabs';
import { FridgeFilters } from '../fridge/FridgeFilters';
import { IngredientCard } from './IngredientCard';
import type { Navigate } from '../../prototype/flow';
import type { Ingredient } from './repository';
import { sortIngredients, type FridgeSort } from '../fridge/sorting';
import { orderByRank, type SearchMatch } from '../fridge/search';
import { isFood } from './expiry';
import { asset } from '../../lib/assets';

export function StoredIngredientsPage({ navigate, items, onOpen, onDelete, registered = false, food = false, matches }: { navigate: Navigate; items: Ingredient[]; onOpen: (item: Ingredient) => void; onDelete: (id: string) => void; registered?: boolean; food?: boolean; matches?: ReadonlyMap<string, SearchMatch> }) {
  const { sort, direction, onChange } = useFridgeSort(readRequestedSort());
  const [openItem, setOpenItem] = useState<string | null>(null);
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const suppressDeleteClick = useRef(false);
  // 검색 결과에는 정렬 필터가 없다. 묶음(정확히 일치·시작·포함·단어·초성·카테고리) 안에서는 저장된 순서(최근 등록이 위)를 쓴다.
  const sorted = matches ? orderByRank(items, matches) : sortIngredients(items, { sort, direction });
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
  const renderRow = (item: Ingredient) => <div className={`stored-ingredient-row${openItem === item.id ? ' is-delete-open' : ''}`} key={item.id} onPointerDown={event => onRowPointerDown(event, item.id)} onPointerMove={event => onRowPointerMove(event, item.id)} onPointerUp={event => onRowPointerUp(event, item.id)} onPointerCancel={onRowPointerCancel} onClick={event => onRowClick(event, item)}>
    <button type="button" className="registered-delete-action" aria-label={`${item.name} 삭제`} onClick={event => {
      if (suppressDeleteClick.current) {
        suppressDeleteClick.current = false;
        event.preventDefault();
        return;
      }
      onDelete(item.id);
      setOpenItem(null);
    }}><img src={asset('delete-action.svg')} alt="" /></button>
    <IngredientCard item={item} match={matches?.get(item.id)} onOpen={() => {}} />
  </div>;
  return <main className={`fridge-page${matches ? ' fridge-search-results' : ''}`}>
    <FridgeTabs food={food} navigate={navigate} />{!matches && <FridgeFilters value={sort} direction={direction} onChange={onChange} />}
    <section className="registered-fridge-list stored-ingredients" aria-label={`${matches ? `검색 결과 ${sorted.length}개 ` : ''}${sort ? `${sort} ${direction === 'asc' ? '오름차순' : '내림차순'} 식재료 목록` : '식재료 목록'}`}>{matches
      // 검색 결과는 식재료·음식 섹션으로 나눈다. 섹션 안의 순서는 묶음 순서 그대로이고, 결과가 없는 섹션은 숨긴다.
      ? [{ title: '식재료', list: sorted.filter(item => !isFood(item)) }, { title: '음식', list: sorted.filter(isFood) }].filter(({ list }) => list.length).map(({ title, list }) => <Fragment key={title}>
        <h2 className="fridge-search-section-title" data-figma-node="6161:7221" aria-label={`${title} ${list.length}개`}>{title}<span>{list.length}</span></h2>{list.map(renderRow)}
      </Fragment>)
      : sorted.map(renderRow)}</section>
  </main>;
}

function readRequestedSort(): FridgeSort | null {
  try {
    const requested = sessionStorage.getItem('kokjipseo:fridge-sort');
    if (requested === '소비기한' || requested === '등록순' || requested === '남은양순') {
      sessionStorage.removeItem('kokjipseo:fridge-sort');
      return requested;
    }
  } catch { /* 기본 정렬 사용 */ }
  return null;
}
