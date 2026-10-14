import { asset } from '../../lib/assets';
import type { Navigate, ScreenId } from '../../prototype/flow';
import { methods } from './RegistrationPage';

const guides = {
  'guide-fridge': { index: 0, tips: ['냉장고 문을 열고 내부를 밝게 해주세요.', '식재료가 가려지지 않도록 정리해주세요.', '한 칸씩 정면에서 전체가 보이도록 촬영해주세요.'] },
  'guide-product': { index: 1, tips: ['밝은 곳에 상품을 놓아주세요.', '상품명과 표시 정보가 잘 보이도록 해주세요.', '흔들리지 않게 상품을 가까이에서 촬영해주세요.'] },
  'guide-receipt': { index: 2, tips: ['영수증을 평평하게 펼쳐주세요.', '상품명과 수량이 선명하게 보이도록 해주세요.', '그림자를 피하고 영수증 전체가 나오도록 촬영해주세요.'] },
  'guide-manual': { index: 3, tips: ['등록할 식재료의 이름을 확인해주세요.', '수량과 보관 위치를 미리 확인해주세요.', '소비기한이 있다면 함께 확인해주세요.'] },
};

export function GuidePage({ screen, navigate }: { screen: ScreenId; navigate: Navigate }) {
  if (!(screen in guides)) return null;
  const guide = guides[screen as keyof typeof guides];
  const method = methods[guide.index];
  return <main className="guide-page">
    <button type="button" className="guide-back" onClick={() => navigate('5558:19197')}>← 등록 방식 다시 선택</button>
    <section className="guide-content">
      <img className="guide-image" src={asset(method.image)} alt="" />
      <h2>{method.title} {guide.index === 3 ? '안내' : '가이드'}</h2>
      <p>{guide.index === 3 ? '입력 전에 아래 내용을 확인해주세요.' : '식재료가 잘 인식되도록 아래 내용을 확인해주세요.'}</p>
      <ol className="guide-tips">{guide.tips.map(tip => <li key={tip}>{tip}</li>)}</ol>
    </section>
  </main>;
}
