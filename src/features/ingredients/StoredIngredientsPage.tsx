import { useFridgeSort } from '../fridge/useFridgeSort';

import { FridgeTabs } from '../fridge/FridgeTabs';
import { FridgeFilters } from '../fridge/FridgeFilters';
import { IngredientCard } from './IngredientCard';
import type { Navigate } from '../../prototype/flow';
import type { Ingredient } from './repository';
import { sortIngredients } from '../fridge/sorting';

export function StoredIngredientsPage({ navigate, items, onOpen, registered = false, food = false }: { navigate: Navigate; items: Ingredient[]; onOpen: (item: Ingredient) => void; registered?: boolean; food?: boolean }) {
  const { sort, direction, onChange } = useFridgeSort(registered ? '등록순' : '소비기한');
  const sorted = sortIngredients(items, { sort, direction });
  return <main className="fridge-page">
    <FridgeTabs food={food} navigate={navigate} /><FridgeFilters value={sort} direction={direction} onChange={onChange} />
    <section className="registered-fridge-list stored-ingredients" aria-label={`${sort} ${direction === 'asc' ? '오름차순' : '내림차순'} 식재료 목록`}>{sorted.map(item => <IngredientCard key={item.id} item={item} onOpen={() => onOpen(item)} />)}</section>
  </main>;
}
