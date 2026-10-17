import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';

export function RecipeEmptyPage({ navigate }: { navigate: Navigate }) {
  return <main className="recipe-empty-page" data-figma-node="5770:18522">
    <section className="recipe-ingredients-header" aria-label="내 냉장고 재료"><h2>내 냉장고 재료</h2><div><button type="button" disabled>모두 취소</button><button type="button" disabled>모두 선택</button></div></section>
    <section className="recipe-empty-state" aria-label="등록된 식재료 없음">
      <img className="recipe-empty-image" src={asset('recipe-empty.png')} alt="냄비와 돋보기 일러스트" />
      <div className="recipe-empty-text"><h2>아직 등록된 식재료가 없어요</h2><p>소비기한이 임박한 재료로 만들 수 있는<br />요리를 추천해 드려요.</p></div>
      <div className="recipe-register"><ActionButton className="action-button-large" onClick={() => navigate('registration')}>식재료 등록하기</ActionButton></div>
    </section>
  </main>;
}
