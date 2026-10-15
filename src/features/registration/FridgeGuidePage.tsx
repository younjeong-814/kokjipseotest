import { SubHeader } from '../../components/SubHeader';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';

const tips = [
  '냉장고 문을 활짝 열고 밝은 곳에서 촬영해 주세요.',
  '가이드 영역에 맞추어 칸 전체가 보이도록 촬영해 주세요.',
  '반사가 심할 경우 플래시를 끄고 촬영해 주세요.',
];

export function FridgeGuidePage({ navigate }: { navigate: Navigate }) {
  return <CaptureGuidePage navigate={navigate} nodeId="3061:13614" label="냉장고 칸 촬영 안내" tips={tips} />;
}

export function ProductGuidePage({ navigate }: { navigate: Navigate }) {
  return <CaptureGuidePage navigate={navigate} nodeId="3372:3710" label="상품 직접 촬영 안내" tips={[
    '상품 전체가 잘 보이도록 촬영해 주세요.',
    '상품명과 포장지의 글자가 잘 보이도록 촬영해 주세요.',
    '빛이 반사되거나 흔들리지 않도록 촬영해 주세요.',
  ]} />;
}

function CaptureGuidePage({ navigate, nodeId, label, tips }: { navigate: Navigate; nodeId: string; label: string; tips: readonly string[] }) {
  return <main className="receipt-guide fridge-capture-guide" data-figma-node={nodeId}>
    <SubHeader title="촬영 가이드" backIcon="fridge-guide-back.svg" onBack={() => navigate('registration')} />
    <section className="guide-tips" aria-label={label}>
      <p className="guide-intro">인식이 잘 되도록 아래 내용을 확인해 주세요</p>
      <img className="guide-image" src={asset('fridge-guide.png')} alt="촬영 대상 전체가 가이드 영역 안에 들어오도록 촬영해 주세요" />
      <ol className="guide-list">{tips.map((tip, index) => <li key={tip}><span className="guide-number">{index + 1}</span><p>{tip}</p></li>)}</ol>
    </section>
    <div className="guide-button-section"><ActionButton className="action-button-large" onClick={() => navigate('camera')}>촬영하기</ActionButton></div>
  </main>;
}
