import { useState } from 'react';
import { ActionButton } from '../../components/ActionButton';
import type { Ingredient } from '../ingredients/repository';
import { matchIngredient } from '../ingredients/classify';
import type { Navigate } from '../../prototype/flow';
import { RecipeEmptyPage } from './RecipeEmptyPage';
import { RecipeResults } from './RecipeResults';

export function RecipePage({ items, navigate }: { items: Ingredient[]; navigate: Navigate }) {
  const names = [...new Set(items.filter(item => (item.remainingPercent ?? 100) > 0).map(item => matchIngredient(item.name)?.keyword ?? item.name.trim()))];
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState<string[] | null>(null);
  const active = selected.filter(name => names.includes(name));
  if (!names.length) return <RecipeEmptyPage navigate={navigate} />;
  const choose = (next: string[]) => { setSelected(next); setQuery(null); };
  return <main className="recipe-page">
    <section className="recipe-ingredients-header" aria-label="내 냉장고 재료"><h2>내 냉장고 재료</h2><div><button type="button" disabled={!active.length} onClick={() => choose([])}>모두 취소</button><button type="button" onClick={() => choose(names.slice(0, 10))}>{names.length > 10 ? '10개 선택' : '모두 선택'}</button></div></section>
    <div className="recipe-search-controls"><p>함께 사용할 재료를 최대 10개 선택해 주세요.</p><div className="recipe-ingredient-choices" role="group" aria-label="레시피 검색 재료">{names.map(name => <button type="button" key={name} aria-pressed={active.includes(name)} disabled={!active.includes(name) && active.length >= 10} onClick={() => choose(active.includes(name) ? active.filter(value => value !== name) : [...active, name])}>{name}</button>)}</div>
      <p aria-live="polite">선택한 재료 {active.length}개{names.length > 10 ? ' · 한 번에 최대 10개까지 검색할 수 있어요.' : ''}</p>
      <ActionButton className="action-button-large" disabled={!active.length} onClick={() => setQuery([...active])}>선택한 재료로 레시피 검색</ActionButton>
    </div>
    {query ? <RecipeResults key={JSON.stringify(query)} ingredients={query} /> : <p className="recipe-search-status" role="status">재료를 선택하고 검색 버튼을 눌러 주세요.</p>}
  </main>;
}
