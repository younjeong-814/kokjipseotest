import { SubHeader } from '../../components/SubHeader';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import { RecipeIngredients } from './RecipeIngredients';
import type { RecipeDetail } from './types';

export function RecipeDetailPage({ recipe, onBack }: { recipe: RecipeDetail; onBack: () => void }) {
  const tags = [
    { icon: 'recipe-detail-time.svg', label: recipe.time },
    { icon: 'recipe-detail-level.svg', label: recipe.difficulty },
    { icon: 'recipe-detail-dish.svg', label: recipe.servings },
  ].filter(tag => tag.label);
  return <main className="recipe-detail-page" data-figma-node="3061:13432">
    <SubHeader title="레시피 상세" backIcon="recipe-detail-back.svg" onBack={onBack} />
    <div className="recipe-detail-body">
      <img className="recipe-detail-hero" src={recipe.imageUrl} alt={recipe.title} />
      <section className="recipe-detail-summary" aria-label="요리 정보"><h2>{recipe.title}</h2><ul className="recipe-detail-tags">{tags.map(tag => <li key={tag.icon}><img src={asset(tag.icon)} alt="" /><span>{tag.label}</span></li>)}</ul></section>
      <RecipeIngredients key={recipe.id} ingredients={recipe.ingredients} />
      <section className="recipe-cooking-steps" aria-labelledby="recipe-steps-heading"><h2 id="recipe-steps-heading">조리 순서</h2><ol>{recipe.steps.map((step, index) => <li key={`${recipe.id}-${index}`}><span className="recipe-step-number" aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}</ol>{!recipe.steps.length && <p className="recipe-detail-empty">등록된 조리 순서가 없어요.</p>}</section>
    </div>
    <footer className="recipe-detail-footer"><ActionButton className="recipe-back-list" onClick={onBack}>목록으로 가기</ActionButton></footer>
  </main>;
}
