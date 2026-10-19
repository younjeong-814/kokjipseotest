import { storageRecommendations } from '../../data/storageRecommendations';
import { toDateKey } from '../../lib/date';

const normalized = (value: string) => value.normalize('NFC').replace(/\s+/g, '');
export const isFood = (item: { name: string; kind?: 'ingredient' | 'food' }) => item.kind === 'food' || (item.kind !== 'ingredient' && storageRecommendations.some(row => row.category === '음식' && [normalized(row.name), normalized(row.name + row.variant)].includes(normalized(item.name))));

/** Exact DB names only; qualified rows require a variant or qualified name. */
export function recommendedDays(name: string, storage: string, variant = ''): number | null {
  const matches = storageRecommendations.filter(row => row.storage.split('/').includes(storage) && (
    variant ? normalized(row.name) === normalized(name) && normalized(row.variant) === normalized(variant)
      : normalized(row.name + row.variant) === normalized(name) || (!row.variant && normalized(row.name) === normalized(name))
        || (row.category === '음식' && ['입력 시', '보관 처리'].includes(row.variant) && normalized(row.name) === normalized(name))
  ));
  return matches.length ? Math.min(...matches.map(row => row.days)) : null;
}

export function calculateRecommendedDate(name: string, storage: string, startedOn: string, variant = ''): string {
  const days = recommendedDays(name, storage, variant);
  const start = new Date(`${startedOn}T00:00:00Z`);
  if (days === null || !Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== startedOn) return '';
  // Whole calendar days: round down so the recommendation never exceeds 80%.
  start.setUTCDate(start.getUTCDate() + Math.floor(days * 0.8));
  return start.toISOString().slice(0, 10);
}

type ExpiryInput = { name: string; storage: string; date: string; storageStartedOn?: string; recommendationVariant?: string; dateSource?: 'manual' | 'automatic' };
export function resolveExpiry<T extends ExpiryInput>(input: T, previous?: ExpiryInput & { createdAt?: string }, now = new Date()) {
  const storageStartedOn = input.storageStartedOn || previous?.storageStartedOn || toDateKey(previous?.createdAt ? new Date(previous.createdAt) : now);
  const automatic = !input.date || input.dateSource === 'automatic' || (input.dateSource !== 'manual' && previous?.dateSource === 'automatic' && input.date === previous.date);
  const date = automatic ? calculateRecommendedDate(input.name, input.storage, storageStartedOn, input.recommendationVariant ?? previous?.recommendationVariant) : input.date;
  return { ...input, storageStartedOn, date, dateSource: date ? automatic ? 'automatic' as const : 'manual' as const : undefined };
}

export function deadlineDays(date: string, today = toDateKey(new Date())): number | null {
  return date ? Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000) : null;
}
export function deadlineLabel(days: number) { return days === 0 ? 'D-DAY' : days > 0 ? `D-${days}` : `D+${-days}`; }
export function compareExpiry(a: { date: string }, b: { date: string }) { return (a.date || '9999-12-31').localeCompare(b.date || '9999-12-31'); }
