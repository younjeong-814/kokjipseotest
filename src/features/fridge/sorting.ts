export const sortLabels = ['소비기한', '등록순', '남은양순'] as const;
export type FridgeSort = typeof sortLabels[number];
export type SortDirection = 'asc' | 'desc';
export type SortState = { sort: FridgeSort; direction: SortDirection };
export const defaultDirection = (sort: FridgeSort): SortDirection => sort === '등록순' ? 'desc' : 'asc';
export function nextSort(state: SortState, sort: FridgeSort): SortState {
  return { sort, direction: state.sort === sort ? state.direction === 'asc' ? 'desc' : 'asc' : defaultDirection(sort) };
}

export function sortIngredients<T extends { date: string; createdAt: string; remainingPercent?: number }>(items: readonly T[], { sort, direction }: SortState): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    if (sort === '소비기한') {
      // Unknown dates stay at the end in either direction.
      if (!a.date || !b.date) return a.date ? -1 : b.date ? 1 : 0;
      return sign * a.date.localeCompare(b.date);
    }
    return sign * (sort === '등록순' ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : (a.remainingPercent ?? 100) - (b.remainingPercent ?? 100));
  });
}
