import type { Navigate } from '../../prototype/flow';

export function FridgeTabs({ food = false, navigate }: { food?: boolean; navigate: Navigate }) {
  return <div className="screen-tabs" role="tablist" aria-label="냉장고 분류">
    <button type="button" role="tab" aria-selected={!food} className={!food ? 'selected' : ''} onClick={() => navigate('fridge')}>식재료</button>
    <button type="button" role="tab" aria-selected={food} className={food ? 'selected' : ''} onClick={() => navigate('fridge-food')}>음식</button>
  </div>;
}
