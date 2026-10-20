import { ActionButton } from '../../components/ActionButton';
import { SubHeader } from '../../components/SubHeader';
import { asset } from '../../lib/assets';
import type { Ingredient } from '../ingredients/repository';

type Props = { selected: Ingredient[]; onBack: () => void; onReselect: () => void };

// Figma 3061:13500 레시피 검색 결과 없음
export function RecipeNoResultPage({ selected, onBack, onReselect }: Props) {
  return <main className="recipe-no-result" data-figma-node="3061:13500">
    <SubHeader title="추천 레시피" onBack={onBack} />
    <section className="recipe-selected" aria-label="선택한 재료">
      <h2>선택한 재료</h2>
      <ul className="recipe-chips">
        {selected.map(item => <li key={item.id}><span className="recipe-chip selected"><span>{item.name}</span><img src={asset('recipe-chip-check.svg')} alt="" width={24} height={24} /></span></li>)}
      </ul>
    </section>
    <section className="recipe-no-result-state" aria-live="polite">
      <img className="recipe-empty-image" src={asset('recipe-empty.png')} alt="냄비와 돋보기 일러스트" />
      <h2>선택한 재료를 모두 사용하는<br />레시피를 찾지 못했어요</h2>
      <p>재료를 다시 선택하거나<br />다른 추천을 둘러보세요</p>
    </section>
    <div className="recipe-no-result-action">
      <ActionButton className="action-button-large" onClick={onReselect}>다른 임박 재료 선택하기</ActionButton>
    </div>
  </main>;
}
