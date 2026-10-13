import { ReminderBanner } from '../../components/ReminderBanner';
import { PrototypeButton } from '../../components/PrototypeButton';
import { additionalConnections, type Navigate } from '../../prototype/flow';
import { asset } from '../../lib/assets';

const methods = [
  { title: '냉장고 칸 촬영', image: 'method-fridge.png', description: <>냉장고 안을 촬영해 여러<br />식재료를 등록해요</> },
  { title: '상품 직접 촬영', image: 'method-camera.png', description: <>상품을 촬영해 식재료 정보<br />를 간편하게 등록해요</> },
  { title: '영수증 촬영', image: 'method-receipt.png', description: <>영수증을 촬영해 식재료를<br />간편하게 등록해요</> },
  { title: '직접입력', image: 'method-edit.png', description: <>필요한 정보를 직접 입력해<br />식재료를 등록해요</> },
];

export function RegistrationPage({ navigate }: { navigate: Navigate }) {
  return (
    <main className="registration-page" data-figma-node="5558:19197">
      <section className="reminder-section"><ReminderBanner /></section>
      <section className="registration-methods">
        <h2>식재료 기록 방식</h2>
        <div className="method-grid">{methods.map((method, index) => {
          const content = <><img src={asset(method.image)} alt="" /><h3>{method.title}</h3><p>{method.description}</p></>;
          return index === 2
            ? <PrototypeButton key={method.title} className="method-card" destination={additionalConnections.receipt.destination} navigate={navigate}>{content}</PrototypeButton>
            : <div className="method-card" key={method.title}>{content}</div>;
        })}</div>
      </section>
      <div className="large-button-section"><button className="action-button action-button-large" disabled>등록 방식을 선택해주세요</button></div>
    </main>
  );
}
