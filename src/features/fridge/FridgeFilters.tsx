import { asset } from '../../lib/assets';

export const sortLabels = ['소비기한', '등록순', '남은양순'] as const;
export type FridgeSort = typeof sortLabels[number];

export function FridgeFilters({ value, onChange }: { value: FridgeSort; onChange: (value: FridgeSort) => void }) {
  return <div className="fridge-filters" role="group" aria-label="냉장고 정렬">{sortLabels.map(label => <button type="button" key={label} aria-pressed={value === label} className={value === label ? 'selected' : ''} onClick={() => onChange(label)}>{label}{value === label && <img src={asset('sort.svg')} alt="" />}</button>)}</div>;
}
