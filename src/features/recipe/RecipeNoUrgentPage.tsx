import { ActionButton } from '../../components/ActionButton';
import { SubHeader } from '../../components/SubHeader';
import { asset } from '../../lib/assets';

type Props = { onBack: () => void; onOpenFridge: () => void };

// Figma 6024:20536 임박한 재료 없음 — 냉장고에 식재료는 있지만 D-3 이내·기한경과 재료가 없을 때
export function RecipeNoUrgentPage({ onBack, onOpenFridge }: Props) {
  return <main className="recipe-no-urgent" data-figma-node="6024:20536">
    <SubHeader title="추천 레시피" onBack={onBack} />
    <section className="recipe-ingredients-header" aria-label="내 냉장고 재료"><h2>내 냉장고 재료</h2><div><button type="button" disabled>모두 취소</button><button type="button" disabled>모두 선택</button></div></section>
    <section className="recipe-no-urgent-state">
      <img className="recipe-empty-image" src={asset('recipe-empty.png')} alt="냄비와 돋보기 일러스트" />
      <h2>임박한 재료가 없어요</h2>
      <p>소비기한이 임박한 재료가 생기면<br />맞춤 레시피를 추천해 드릴게요</p>
    </section>
    <div className="recipe-no-result-action">
      <ActionButton className="action-button-large" onClick={onOpenFridge}>내 냉장고 확인하기</ActionButton>
    </div>
  </main>;
}
