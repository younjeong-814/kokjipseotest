import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
export function EmptyFridge({ onRegister }: { onRegister: () => void }) {
  return <section className="empty-fridge"><div className="empty-content"><img className="empty-illustration" src={asset('empty-fridge.png')} alt="빈 냉장고 일러스트"/><h2>첫 식재료를 등록해 주세요</h2><p>냉장고 속 식재료부터 하나씩 시작해 보세요.</p></div><ActionButton onClick={onRegister}>식재료 등록하기</ActionButton></section>;
}
