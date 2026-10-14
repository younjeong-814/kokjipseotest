import { Fragment } from 'react';
import { SubHeader } from '../../components/SubHeader';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';

const items = [
  { name: '두부', quantity: 1, price: '2,500' },
  { name: '대파', quantity: 1, price: '2,000' },
  { name: '우유', quantity: 1, price: '3,200' },
];

/** 영수증 OCR - 카메라 촬영 (Figma 5579:702) */
export function ReceiptCameraPage({ navigate }: { navigate: Navigate }) {
  return (
    <main className="receipt-camera" data-figma-node="5579:702">
      <SubHeader title="영수증 촬영" onBack={() => navigate('5572:19475')} />
      <section className="camera-view" aria-label="카메라 미리보기">
        <div className="camera-guide-bar">
          <p>영수증 전체가 보이도록 맞춰 주세요</p>
          <button type="button" className="camera-flash" aria-label="플래시 꺼짐" aria-pressed={false}>
            <img src={asset('flash-off.svg')} alt="" width={24} height={24} />
          </button>
        </div>
        <div className="camera-preview">
          <div className="receipt-sample" aria-hidden="true">
            <b className="receipt-store">콕집서 마트</b>
            <p className="receipt-meta">구매 영수증<br />2026.10.13&nbsp;&nbsp;14:30</p>
            <hr />
            <div className="receipt-items">
              <span className="receipt-name">상품명</span><span>수량</span><span>금액</span>
              <span className="receipt-gap" />
              {items.map(item => <Fragment key={item.name}><span className="receipt-name">{item.name}</span><span>{item.quantity}</span><span>{item.price}</span></Fragment>)}
            </div>
            <hr />
            <p className="receipt-total"><span>합계</span><span>7,700원</span></p>
          </div>
          <img className="receipt-guide-frame" src={asset('receipt-guide-frame.svg')} alt="" width={266} height={402} />
        </div>
        <div className="camera-controls">
          <p className="camera-tip">글씨가 선명하고 빛이 반사되지 않게 촬영해 주세요</p>
          <div className="camera-actions">
            <button type="button" className="camera-album">
              <img src={asset('album.svg')} alt="" width={28} height={28} />
              <span>앨범</span>
            </button>
            <button type="button" className="camera-shutter" aria-label="영수증 촬영">
              <img src={asset('shutter.svg')} alt="" width={80} height={80} />
            </button>
            <span className="camera-actions-spacer" />
          </div>
          <p className="camera-label">영수증 촬영</p>
          <span className="home-indicator" />
        </div>
      </section>
    </main>
  );
}
