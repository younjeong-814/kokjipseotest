import { useId, useState } from 'react';
import { CardShell } from '../../components/CardShell';
import type { RecipeIngredient } from './types';
import { cleanIngredientParts } from './ingredientText';

const rows = (items: readonly RecipeIngredient[]) => items.map(ingredient => {
  const { name, amount } = cleanIngredientParts(ingredient.name, ingredient.amount);
  return <li key={ingredient.id}><span className="recipe-ingredient-name">{name}</span><span className="recipe-ingredient-amount">{amount}</span></li>;
});

export function RecipeIngredients({ ingredients }: { ingredients: readonly RecipeIngredient[] }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  // Plain ingredients first; sauce groups follow under their own subheading in source order.
  const main = ingredients.filter(item => !item.group);
  const groups = [...new Set(ingredients.flatMap(item => item.group ? [item.group] : []))].map(title => ({ title, items: ingredients.filter(item => item.group === title) }));
  // Collapsed view shows plain ingredients only; fall back to the first rows when every row is in a sauce group.
  const collapsed = main.length ? main.slice(0, 4) : ingredients.slice(0, 4);
  const canExpand = collapsed.length < ingredients.length;
  return <section className="recipe-detail-ingredients" aria-labelledby={`${listId}-heading`}>
    <h2 id={`${listId}-heading`}>필요한 재료</h2>
    <CardShell className="recipe-ingredient-card">
      <div id={listId}>
        {expanded || !canExpand ? <>
          {main.length > 0 && <ul className="recipe-ingredient-rows" data-figma-node="5056:2928">{rows(main)}</ul>}
          {groups.map(group => <section key={group.title} className="recipe-ingredient-group" aria-label={group.title}>
            <h3>{group.title}</h3>
            <ul className="recipe-ingredient-rows">{rows(group.items)}</ul>
          </section>)}
        </> : <ul className="recipe-ingredient-rows" data-figma-node="5056:2928">{rows(collapsed)}</ul>}
      </div>
      {!ingredients.length && <p className="recipe-detail-empty">등록된 재료 정보가 없어요.</p>}
      {canExpand && <button type="button" className="recipe-ingredients-toggle" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>필요한 재료 {expanded ? '접기' : '더보기'}</button>}
    </CardShell>
  </section>;
}
