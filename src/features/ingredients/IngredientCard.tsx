import { CardShell } from '../../components/CardShell';
import { asset } from '../../lib/assets';
import type { Ingredient } from './repository';
import { deadlineDays, deadlineLabel } from './expiry';
import { categoryImage } from './images';

// 카드·홈·상세 모두 Figma 카테고리 썸네일(images.ts)을 쓴다.
export const ingredientImage = (item: Ingredient) => categoryImage(item.category);

export function IngredientCard({ item, onOpen }: { item: Ingredient; onOpen: () => void }) {
  const percent = item.remainingPercent ?? 100;
  const days = deadlineDays(item.date);
  const bars: Record<number, string> = { 25: 'remaining-quarter.svg', 50: 'remaining-half.svg', 75: 'remaining-threequarter.svg', 100: 'ingredient-card-full.svg' };
  return <article data-figma-node="5820:5981"><button type="button" className="ingredient-card-trigger" aria-label={`${item.name} 상세 보기`} onClick={onOpen}>
    <CardShell className="ingredient-card"><div className="ingredient-card-image"><img src={asset(ingredientImage(item))} alt="" /><span>{item.category}</span></div>
      <div className="ingredient-card-info"><h2 title={item.name}>{item.name}</h2><div className="food-badges"><span>{item.storage}</span>{days !== null && <span className={days < 0 ? 'red' : days === 0 ? 'orange' : 'green'}>{deadlineLabel(days)}</span>}</div><div className="ingredient-card-remaining"><p>남은 양</p><div>{percent === 0 ? <span className="ingredient-zero-bar" /> : <img src={asset(bars[percent])} alt="" />}<b>{percent}%</b></div></div></div>
    </CardShell>
  </button></article>;
}
