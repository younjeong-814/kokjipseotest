import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import { searchRecipes } from './api';
import type { Recipe, RecipeSearchResult } from './types';
import type { Ingredient } from '../ingredients/repository';
import { SubHeader } from '../../components/SubHeader';
import { RecipeNoResultPage } from './RecipeNoResultPage';

export function RecipeResults({ ingredients, onOpen, selectionContext, renderResults }: { ingredients: readonly string[]; renderResults?: (data: RecipeSearchResult, pagination: ReactNode) => ReactNode; onOpen?: (recipe: Recipe) => void; selectionContext?: { selected: Ingredient[]; onBack: () => void; onReselect: () => void } }) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ loading: boolean; data?: RecipeSearchResult; error?: string }>({ loading: true });
  const query = JSON.stringify(ingredients);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    searchRecipes(JSON.parse(query), page, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ loading: false, data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ loading: false, error: error instanceof Error ? error.message : '레시피 검색에 실패했어요.' });
    });
    return () => controller.abort();
  }, [query, page, retry]);
  if (state.data?.total === 0 && selectionContext) return <RecipeNoResultPage {...selectionContext} />;
  if (state.data && state.data.total > 0 && renderResults) return <>{renderResults(state.data, <nav className="recipe-pagination" aria-label="레시피 검색 페이지"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>이전</button><span>{page} / {Math.max(1, Math.ceil(state.data.total / state.data.pageSize))}</span><button type="button" disabled={page * state.data.pageSize >= state.data.total} onClick={() => setPage(value => value + 1)}>다음</button></nav>)}</>;
  const results = <section className="recipe-results" aria-label="레시피 검색 결과" aria-busy={state.loading}>
    {state.loading && <p className="recipe-search-status" role="status">선택한 재료로 레시피를 찾고 있어요.</p>}
    {state.error && <div className="recipe-search-status"><p role="alert">{state.error}</p><ActionButton onClick={() => setRetry(value => value + 1)}>다시 시도</ActionButton></div>}
    {state.data && <>
      <h2 tabIndex={-1} aria-live="polite">검색 결과 {state.data.total}개</h2>
      {state.data.total === 0 ? <div className="recipe-search-status" role="status"><img src={asset('recipe-empty.png')} alt="" /><h3>선택한 재료로 찾은 레시피가 없어요</h3><p>재료를 줄이거나 다른 재료를 선택해 보세요.</p></div> : <>
        <p className="recipe-match-description">선택한 재료가 모두 포함된 레시피예요. 추가 재료가 필요할 수 있어요.</p>
        <ul className="recipe-result-list">{state.data.recipes.map(recipe => <li key={recipe.id}><article className="recipe-result-card">
          <img src={recipe.image || asset('recipe-empty.png')} alt={recipe.name} loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = asset('recipe-empty.png'); }} />
          <div><h3>{recipe.name}</h3><p>{[recipe.time, recipe.difficulty, recipe.servings, recipe.calories].filter(Boolean).join(' · ')}</p><p className="recipe-result-ingredients">{recipe.ingredients.map(item => item.name).join(', ')}</p>{onOpen && <button type="button" onClick={() => onOpen(recipe)}>{recipe.name} 상세 보기</button>}</div>
        </article></li>)}</ul>
        <nav className="recipe-pagination" aria-label="레시피 검색 페이지"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>이전</button><span>{page} / {Math.max(1, Math.ceil(state.data.total / state.data.pageSize))}</span><button type="button" disabled={page * state.data.pageSize >= state.data.total} onClick={() => setPage(value => value + 1)}>다음</button></nav>
      </>}
      <p className="recipe-source">출처: 농림수산식품교육문화정보원</p>
    </>}
  </section>;
  return selectionContext ? <main className="recipe-no-result">
    <SubHeader title="추천 레시피" onBack={selectionContext.onBack} />
    <section className="recipe-selected" aria-label="선택한 재료"><h2>선택한 재료</h2><ul className="recipe-chips">{selectionContext.selected.map(item => <li key={item.id}><span className="recipe-chip selected"><span>{item.name}</span><img src={asset('recipe-chip-check.svg')} alt="" width={24} height={24} /></span></li>)}</ul></section>
    {results}
    <div className="recipe-no-result-action"><ActionButton className="action-button-large" onClick={selectionContext.onReselect}>다른 임박 재료 선택하기</ActionButton></div>
  </main> : results;
}
