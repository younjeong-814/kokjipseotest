import { asset } from '../lib/assets';

export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sub-header">
      <button type="button" className="sub-header-back" aria-label="뒤로 가기" onClick={onBack}>
        <img src={asset('arrow-back.svg')} alt="" width={24} height={24} />
      </button>
      <h1>{title}</h1>
    </header>
  );
}
