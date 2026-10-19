import type { Ingredient } from '../ingredients/repository';

export const HOME_URGENT_DAYS = 3;
export function selectHomeIngredients(items: Ingredient[], today: Date) {
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntil = (item: Ingredient): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return null;
    const time = Date.parse(`${item.date}T00:00:00Z`);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== item.date) return null;
    return Math.round((time - todayUtc) / 86400000);
  };
  const recent = [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
  const urgent = recent.map(item => ({ item, days: daysUntil(item) })).filter((entry): entry is { item: Ingredient; days: number } => entry.days !== null && entry.days <= HOME_URGENT_DAYS).sort((a, b) => a.days - b.days);
  return urgent.length
    ? { mode: 'urgent' as const, entries: urgent.slice(0, 4) }
    : { mode: 'recent' as const, entries: recent.slice(0, 4).map(item => ({ item, days: daysUntil(item) })) };
}
