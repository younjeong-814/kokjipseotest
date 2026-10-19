import { useFridgeSort } from './useFridgeSort';
import { asset } from '../../lib/assets';

import { FridgeTabs } from './FridgeTabs';
import { FridgeFilters } from './FridgeFilters';
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
  const expiryDays = (item: typeof examples[number]) => {
    if (item.badge === 'D-DAY') return 0;
    const match = (item.secondBadge ?? item.badge ?? '').match(/^D([+-])(\d+)$/);
    return match ? Number(match[2]) * (match[1] === '+' ? -1 : 1) : Number.POSITIVE_INFINITY;
  };
  const sign = direction === 'asc' ? 1 : -1;
  const sorted = [...examples].sort((a, b) => {
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
      <section className="registered-fridge-list" aria-label={`${sort} 식재료 목록`}>{sorted.map(item => <article className="registered-food-card" key={item.name}>
        <div className="registered-food-image"><img src={asset(item.image)} alt="" /><span>{item.category}</span></div>
        <div className="registered-food-info"><h2 title={item.name}>{item.name}</h2><div className="food-badges"><span>{item.storage}</span>{item.badge && <span className={item.tone}>{item.badge}</span>}{item.secondBadge && <span className={item.tone}>{item.secondBadge}</span>}</div><div className="food-remaining"><p>남은 양</p><div><img src={asset(bars[item.percent])} alt="" /><b>{item.percent}%</b></div></div></div>
      </article>)}</section>
    </main>
  );
}

