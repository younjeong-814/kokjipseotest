import { useId, useState } from 'react';
import { CardShell } from '../../components/CardShell';
import type { RecipeIngredient } from './types';

export function RecipeIngredients({ ingredients }: { ingredients: readonly RecipeIngredient[] }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const visible = expanded ? ingredients : ingredients.slice(0, 4);
  return <section className="recipe-detail-ingredients" aria-labelledby={`${listId}-heading`}>
    <h2 id={`${listId}-heading`}>필요한 재료</h2>
    <CardShell className="recipe-ingredient-card">
      <ul id={listId} className="recipe-ingredient-rows">{visible.map(ingredient => <li key={ingredient.id}><span>{ingredient.name}</span><span>{ingredient.amount}</span></li>)}</ul>
      {!ingredients.length && <p className="recipe-detail-empty">등록된 재료 정보가 없어요.</p>}
      {ingredients.length > 4 && <button type="button" className="recipe-ingredients-toggle" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>필요한 재료 {expanded ? '접기' : '더보기'}</button>}
    </CardShell>
  </section>;
}
