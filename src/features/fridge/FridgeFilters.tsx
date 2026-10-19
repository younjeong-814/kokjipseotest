import { asset } from '../../lib/assets';

import { sortLabels, type FridgeSort, type SortDirection } from './sorting';
export { sortLabels, type FridgeSort } from './sorting';

export function FridgeFilters({ value, direction, onChange }: { value: FridgeSort; direction: SortDirection; onChange: (value: FridgeSort) => void }) {
  const order = direction === 'asc' ? '오름차순' : '내림차순';
  return <div className="fridge-filters" role="group" aria-label="냉장고 정렬">{sortLabels.map(label => <button type="button" key={label} aria-pressed={value === label} aria-label={value === label ? `${label} ${order}, 다시 누르면 ${direction === 'asc' ? '내림차순' : '오름차순'}` : label} title={value === label ? `${order} · 다시 눌러 정렬 방향 변경` : undefined} className={value === label ? 'selected' : ''} onClick={() => onChange(label)}>{label}{value === label && <img src={asset('sort.svg')} alt="" className={direction === 'asc' ? 'sort-ascending' : undefined} />}</button>)}</div>;
}
