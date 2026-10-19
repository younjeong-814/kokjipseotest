import { useState } from 'react';
import { defaultDirection, nextSort, type FridgeSort, type SortState } from './sorting';

/** 냉장고 정렬 필터. 기본값은 아무것도 고르지 않은 상태다. */
export function useFridgeSort(initial: FridgeSort | null = null) {
  const [state, setState] = useState<SortState>(() => ({ sort: initial, direction: defaultDirection(initial) }));
  return { ...state, onChange: (sort: FridgeSort) => setState(previous => nextSort(previous, sort)) };
}
