import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';
export function FridgePage({ navigate }: { navigate: Navigate }) {
  return (
    <main className="fridge-page" data-figma-node="5558:19292">
      <div className="screen-tabs"><span className="selected">식재료</span><span>음식</span></div>
      <div className="fridge-filters"><span className="selected">소비기한<img src={asset('sort.svg')} alt="" /></span><span>등록순</span><span>남은양순</span></div>
      <section className="fridge-empty-state">
        <img className="empty-illustration" src={asset('empty-fridge.png')} alt="빈 냉장고 일러스트" />
        <div className="fridge-empty-text"><h2>아직 등록된 식재료가 없어요</h2><p>첫 식재료를 등록하면 남은 양과<br />소비 기한을 한눈에 확인할 수 있어요.</p></div>
        <div className="fridge-empty-action"><ActionButton className="action-button-large" onClick={() => navigate('registration')}>식재료 등록하기</ActionButton></div>
      </section>
    </main>
  );
}
