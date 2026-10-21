import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';

export function MyPageInsufficient({ onRegister }: { onRegister: () => void }) {
  return <>
    <section className="mypage-insufficient-state" aria-label="분석 데이터 부족 안내">
      <img className="mypage-insufficient-image" src={asset('mypage-insufficient.png')} alt="" />
      <h2>아직 분석할 데이터가 부족해요</h2>
      <p>데이터가 쌓이면 분석 결과를 제공해 드릴게요</p>
      <div className="mypage-insufficient-note"><img src={asset('mypage-insufficient-info.svg')} alt="" /><span>식재료를 3개 이상 소비하거나 폐기하면 확인할 수 있어요</span></div>
    </section>
    <div className="mypage-insufficient-actions"><ActionButton onClick={onRegister}>식재료 등록하기</ActionButton></div>
  </>;
}
