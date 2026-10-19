import { useState } from 'react';
import { defaultDirection, nextSort, type FridgeSort, type SortState } from './sorting';

export function useFridgeSort(initial: FridgeSort = '소비기한') {
  const [state, setState] = useState<SortState>(() => ({ sort: initial, direction: defaultDirection(initial) }));
  return { ...state, onChange: (sort: FridgeSort) => setState(previous => nextSort(previous, sort)) };
}
