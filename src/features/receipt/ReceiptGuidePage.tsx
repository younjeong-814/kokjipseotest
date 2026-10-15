import { SubHeader } from '../../components/SubHeader';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';

const tips = [
  '영수증을 구김 없이 평평하게 펼쳐 주세요.',
  '영수증 전체가 화면에 들어오게 촬영해 주세요.',
  '글씨가 선명하게 보이도록 밝은 곳에서 촬영해 주세요.',
];

/** 촬영 가이드_영수증 촬영 (Figma 5572:19475) */
export function ReceiptGuidePage({ navigate }: { navigate: Navigate }) {
  return (
    <main className="receipt-guide" data-figma-node="5572:19475">
      <SubHeader title="촬영 가이드" onBack={() => navigate('registration')} />
      <section className="guide-tips">
        <p className="guide-intro">인식이 잘 되도록 아래 내용을 확인해 주세요</p>
        <img className="guide-image" src={asset('receipt-guide.png')} alt="" />
        <ol className="guide-list">
          {tips.map((tip, index) => <li key={tip}><span className="guide-number">{index + 1}</span><p>{tip}</p></li>)}
        </ol>
      </section>
      <div className="guide-button-section">
        <button type="button" className="action-button action-button-large" onClick={() => navigate('camera')}>촬영하기</button>
      </div>
    </main>
  );
}
