import { WelcomeBanner } from './WelcomeBanner';
import { FridgeSummary } from './FridgeSummary';
import { EmptyFridge } from './EmptyFridge';
import type { Navigate } from '../../prototype/flow';
import type { Ingredient } from '../ingredients/repository';
import { ActionButton } from '../../components/ActionButton';
export function HomePage({ navigate, items }: { navigate: Navigate; items: Ingredient[] }) {
  return <main data-figma-node="5558:18818"><WelcomeBanner /><FridgeSummary items={items} />{items.length ? <section className="home-stored"><h2>등록한 식재료 {items.length}개</h2><ActionButton onClick={() => navigate('fridge')}>냉장고에서 확인하기</ActionButton></section> : <EmptyFridge onRegister={() => navigate('registration')} />}</main>;
}
