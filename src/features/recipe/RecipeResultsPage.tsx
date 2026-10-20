import { SubHeader } from '../../components/SubHeader';
import { CardShell } from '../../components/CardShell';
import { asset } from '../../lib/assets';
import type { RecipeSummary } from './types';
import { approximateTime } from './apiPresentation';

export function RecipeResultsPage({ recipes, selectedIngredients, onBack, onOpen }: { onOpen?: (id: string) => void; recipes: readonly RecipeSummary[]; selectedIngredients: readonly string[]; onBack: () => void }) {
  return <main className="recipe-results-page" data-figma-node="3061:13305">
    <SubHeader title="추천 레시피" backIcon="recipe-detail-back.svg" onBack={onBack} />
    <section className="recipe-selected" aria-labelledby="recipe-selected-heading">
      <h2 id="recipe-selected-heading">선택한 재료</h2>
      <ul>{selectedIngredients.map(name => <li key={name}>{name}<img src={asset('recipe-result-check.svg')} alt="선택됨" /></li>)}</ul>
    </section>
    <section className="recipe-results" aria-labelledby="recipe-results-heading">
      <h2 id="recipe-results-heading">레시피</h2>
      <ul>{recipes.map(recipe => <li key={recipe.id}><a onClick={event => { if (onOpen) { event.preventDefault(); onOpen(recipe.id); } }} href={`#recipe-detail?recipe=${encodeURIComponent(recipe.id)}`} aria-label={`${recipe.title} 상세 보기`}>
        <CardShell className="recipe-result-card">
          <img className="recipe-result-image" src={recipe.imageUrl} alt={recipe.title} />
          <div className="recipe-result-content"><h3>{recipe.title}</h3>
            <div className="recipe-result-metadata">{recipe.time && <span><img src={asset('recipe-detail-time.svg')} alt="" />{approximateTime(recipe.time)}</span>}{recipe.time && recipe.difficulty && <span aria-hidden="true">·</span>}{recipe.difficulty && <span><img src={asset('recipe-detail-level.svg')} alt="" />{recipe.difficulty}</span>}</div>
            <ul className="recipe-result-tags" aria-label="재료">{recipe.tags.map(tag => <li key={tag}>#{tag}</li>)}</ul>
          </div>
        </CardShell>
      </a></li>)}</ul>
      {!recipes.length && <p className="recipe-detail-empty">선택한 재료로 만들 수 있는 레시피가 없어요.</p>}
    </section>
  </main>;
}
