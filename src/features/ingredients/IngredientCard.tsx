import { CardShell } from '../../components/CardShell';
import { asset } from '../../lib/assets';
import type { Ingredient } from './repository';
import { deadlineDays, deadlineLabel } from './expiry';

const images: Record<string, string> = { '육류': 'food-meat.png', '과일': 'food-fruit.png', '채소': 'ai-vegetable.png', '두부·콩류': 'ai-bean.png', '수산물': 'ingredient-card-fish.png', '조미료': 'food-sauce.png' };
export const ingredientImage = (item: Ingredient) => item.category === '조미료' ? 'detail-sauce.png' : images[item.category] ?? 'food-processed.png';

export function IngredientCard({ item, onOpen }: { item: Ingredient; onOpen: () => void }) {
  const percent = item.remainingPercent ?? 100;
  const days = deadlineDays(item.date);
  const bars: Record<number, string> = { 25: 'remaining-quarter.svg', 50: 'remaining-half.svg', 75: 'remaining-threequarter.svg', 100: 'ingredient-card-full.svg' };
  return <article data-figma-node="5820:5981"><button type="button" className="ingredient-card-trigger" aria-label={`${item.name} 상세 보기`} onClick={onOpen}>
    <CardShell className="ingredient-card"><div className="ingredient-card-image"><img src={asset(images[item.category] ?? 'food-processed.png')} alt="" /><span>{item.category}</span></div>
      <div className="ingredient-card-info"><h2 title={item.name}>{item.name}</h2><div className="food-badges"><span>{item.storage}</span>{days !== null && <span className={days < 0 ? 'red' : days === 0 ? 'orange' : 'green'}>{deadlineLabel(days)}</span>}</div><div className="ingredient-card-remaining"><p>남은 양</p><div>{percent === 0 ? <span className="ingredient-zero-bar" /> : <img src={asset(bars[percent])} alt="" />}<b>{percent}%</b></div></div></div>
    </CardShell>
  </button></article>;
}
