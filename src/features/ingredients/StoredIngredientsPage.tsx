import { useState } from 'react';
import { FridgeTabs } from '../fridge/FridgeTabs';
import { FridgeFilters, type FridgeSort } from '../fridge/FridgeFilters';
import { IngredientCard } from './IngredientCard';
import type { Navigate } from '../../prototype/flow';
import type { Ingredient } from './repository';

export function StoredIngredientsPage({ navigate, items, onOpen, registered = false }: { navigate: Navigate; items: Ingredient[]; onOpen: (item: Ingredient) => void; registered?: boolean }) {
  const [sort, setSort] = useState<FridgeSort>(registered ? '등록순' : '소비기한');
  const sorted = [...items].sort((a, b) => sort === '등록순' ? b.createdAt.localeCompare(a.createdAt) : sort === '남은양순' ? (a.remainingPercent ?? 100) - (b.remainingPercent ?? 100) : (a.date || '9999').localeCompare(b.date || '9999'));
  return <main className="fridge-page">
    <FridgeTabs navigate={navigate} /><FridgeFilters value={sort} onChange={setSort} />
    <section className="registered-fridge-list stored-ingredients" aria-label={`${sort} 식재료 목록`}>{sorted.map(item => <IngredientCard key={item.id} item={item} onOpen={() => onOpen(item)} />)}</section>
  </main>;
}
