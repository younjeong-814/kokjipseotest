import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { asset } from '../../lib/assets';
import { FridgeTabs } from './FridgeTabs';
import { FridgeFilters } from './FridgeFilters';
import { useFridgeSort } from './useFridgeSort';
import type { Navigate } from '../../prototype/flow';

// The register reaction navigates to this fixed Figma frame; it does not save data.
const examples = [
  { name: '손질 생고등어', category: '수산물', image: 'thumb-fish.png', storage: '냉장', percent: 100 },
  { name: '특등급 국산콩 콩나물', category: '채소', image: 'thumb-vegetable.png', storage: '냉장', percent: 100 },
  { name: '햇사과 홍로 2.5kg 봉', category: '과일', image: 'thumb-fruit.png', storage: '냉장', percent: 100 },
  { name: '존쿡 델리미트 킬바사 207g 골라담기', category: '가공식품', image: 'thumb-processed.png', storage: '냉동', percent: 50, badge: 'D-DAY', tone: 'orange' },
  { name: '샘표 조선국간장', category: '조미료·소스', image: 'thumb-sauce.png', storage: '실온', percent: 25, badge: '기한경과', secondBadge: 'D+360', tone: 'red' },
  { name: '저온숙성 무항생제 한돈삼겹살 1kg', category: '육류', image: 'thumb-meat.png', storage: '냉장', percent: 50, badge: 'D-3', tone: 'green' },
  { name: '대파', category: '채소', image: 'thumb-vegetable.png', storage: '냉동', percent: 75, badge: 'D-1', tone: 'green' },
  { name: '부침찌개겸용두부', category: '곡물·두부', image: 'thumb-bean.png', storage: '냉장', percent: 100 },
];
const bars: Record<number, string> = { 25: 'remaining-quarter.svg', 50: 'remaining-half.svg', 75: 'remaining-threequarter.svg', 100: 'remaining-full.svg' };

export function RegisteredFridgePage({ navigate }: { navigate: Navigate }) {
  const { sort, direction, onChange } = useFridgeSort('등록순');
  const [items, setItems] = useState(examples);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const drag = useRef<{ name: string; x: number; y: number; moved: boolean } | null>(null);
  const suppressDeleteClick = useRef(false);
  const removeItem = (name: string) => {
    setItems(current => current.filter(item => item.name !== name));
    setOpenItem(null);
  };
  const onRowPointerDown = (event: ReactPointerEvent<HTMLDivElement>, name: string) => {
    // Keep the delete button's native click intact; capture the gesture elsewhere on the row.
    if (!(event.target instanceof Element && event.target.closest('.registered-delete-action'))) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    drag.current = { name, x: event.clientX, y: event.clientY, moved: false };
  };
  const onRowPointerMove = (event: ReactPointerEvent<HTMLDivElement>, name: string) => {
    const start = drag.current;
    if (!start || start.name !== name) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) start.moved = true;
    if (start.moved) {
      const card = event.currentTarget.querySelector<HTMLElement>('.registered-food-card');
      card?.style.setProperty('--delete-drag', `${Math.max(-39, Math.min(0, (openItem === name ? -39 : 0) + dx))}px`);
    }
  };
  const onRowPointerUp = (event: ReactPointerEvent<HTMLDivElement>, name: string) => {
    const start = drag.current;
    if (!start || start.name !== name) return;
    const dx = event.clientX - start.x;
    if (start.moved) {
      event.currentTarget.querySelector<HTMLElement>('.registered-food-card')?.style.removeProperty('--delete-drag');
      if (dx < -18) setOpenItem(name);
      else if (dx > 10) setOpenItem(null);
      if (Math.abs(dx) > 10) {
        suppressDeleteClick.current = true;
        window.setTimeout(() => { suppressDeleteClick.current = false; }, 300);
      }
    }
    drag.current = null;
  };
  const onRowPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.querySelector<HTMLElement>('.registered-food-card')?.style.removeProperty('--delete-drag');
    drag.current = null;
  };
  const expiryDays = (item: typeof examples[number]) => {
    if (item.badge === 'D-DAY') return 0;
    const match = (item.secondBadge ?? item.badge ?? '').match(/^D([+-])(\d+)$/);
    return match ? Number(match[2]) * (match[1] === '+' ? -1 : 1) : Number.POSITIVE_INFINITY;
  };
  const sign = direction === 'asc' ? 1 : -1;
  const sorted = [...items].sort((a, b) => {
    if (sort === '남은양순') return sign * (a.percent - b.percent);
    if (sort === '등록순') return -sign * (examples.indexOf(a) - examples.indexOf(b));
    const left = expiryDays(a), right = expiryDays(b);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.isFinite(left) ? -1 : Number.isFinite(right) ? 1 : 0;
    return sign * (left - right);
  });

  return (
    <main className="fridge-page" data-figma-node="5572:19852">
      <FridgeTabs navigate={navigate} />
      <FridgeFilters value={sort} direction={direction} onChange={onChange} />
      <section className="registered-fridge-list" aria-label={`${sort} 식재료 목록`}>
        {sorted.map(item => (
          <div className={`registered-food-row${openItem === item.name ? ' is-delete-open' : ''}`} key={item.name} onPointerDown={event => onRowPointerDown(event, item.name)} onPointerMove={event => onRowPointerMove(event, item.name)} onPointerUp={event => onRowPointerUp(event, item.name)} onPointerCancel={onRowPointerCancel}>
            <button type="button" className="registered-delete-action" aria-label={`${item.name} 삭제`} onClick={event => {
              if (suppressDeleteClick.current) {
                suppressDeleteClick.current = false;
                event.preventDefault();
                return;
              }
              removeItem(item.name);
            }}><img src={asset('delete-action.svg')} alt="" /></button>
            <article className="registered-food-card">
              <div className="registered-food-image"><img className={item.image === 'ai-vegetable.png' || item.image === 'food-meat.png' ? 'vegetable' : ''} src={asset(item.image)} alt="" /><span>{item.category}</span></div>
              <div className="registered-food-info"><h2 title={item.name}>{item.name}</h2><div className="food-badges"><span>{item.storage}</span>{item.badge && <span className={item.tone}>{item.badge}</span>}{item.secondBadge && <span className={item.tone}>{item.secondBadge}</span>}</div><div className="food-remaining"><p>남은 양</p><div><img src={asset(bars[item.percent])} alt="" /><b>{item.percent}%</b></div></div></div>
            </article>
          </div>
        ))}
      </section>
    </main>
  );
}
