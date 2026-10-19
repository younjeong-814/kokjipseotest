import { useFridgeSort } from './useFridgeSort';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';

import { FridgeTabs } from './FridgeTabs';
import { FridgeFilters } from './FridgeFilters';
export function FridgePage({ navigate }: { navigate: Navigate }) {
  const { sort, direction, onChange } = useFridgeSort();
  return (
    <main className="fridge-page" data-figma-node="5558:19292">
      <FridgeTabs navigate={navigate} />
      <FridgeFilters value={sort} direction={direction} onChange={onChange} />
      <section className="fridge-empty-state">
        <img className="empty-illustration" src={asset('fridge-food-empty.png')} alt="식재료가 담긴 냄비 일러스트" />
        <div className="fridge-empty-text"><h2>아직 등록된 식재료가 없어요</h2><p>채소부터 과일, 고기까지 다양한 식재료를<br />등록하고 간편하게 관리해 보세요.</p></div>
        <div className="fridge-empty-action"><ActionButton className="action-button-large" onClick={() => navigate('registration')}>식재료 등록하기</ActionButton></div>
      </section>
    </main>
  );
}
