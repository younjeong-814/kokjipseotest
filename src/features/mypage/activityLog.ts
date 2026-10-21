import type { Ingredient } from '../ingredients/repository';
import { isFood } from '../ingredients/expiry';
import type { DisposalRecord } from '../report/weeklyReport';
export const ACTIVITY_KEY = 'kokjipseo.report-activities.v1';
export type ActivityType = 'registered' | 'condition' | 'storage' | 'partial' | 'consumed' | 'discarded';
export type ReportActivity = { id: string; itemId: string; type: ActivityType; name: string; category: string; at: string; expiry?: string; legacy?: boolean };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const types: ActivityType[] = ['registered','condition','storage','partial','consumed','discarded'];
export function readActivities(storage: Store): ReportActivity[] {
  const raw = storage.getItem(ACTIVITY_KEY);
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(e => e && typeof e.id === 'string' && typeof e.itemId === 'string' && types.includes(e.type) && typeof e.name === 'string' && typeof e.category === 'string' && typeof e.at === 'string' && Number.isFinite(Date.parse(e.at)) && (e.expiry === undefined || typeof e.expiry === 'string'))) throw new Error('리포트 이력을 읽지 못했어요. 기존 기록은 덮어쓰지 않았어요.');
  return data;
}
export function syncActivities(storage: Store, items: Ingredient[], history: DisposalRecord[], before: Ingredient[] = items, now = new Date()): ReportActivity[] {
  const existing = readActivities(storage), map = new Map(existing.map(e => [e.id,e]));
  const add = (event: ReportActivity) => { if (!map.has(event.id)) map.set(event.id,event); };
  const event = (item: Ingredient, type: ActivityType, at: string, suffix = at): ReportActivity => ({ id: `${type}:${item.id}:${suffix}`, itemId:item.id, type, name:item.name, category:item.category, at, expiry:item.date || undefined });
  for (const item of [...before,...items]) {
    if (isFood(item)) continue;
    add(event(item,'registered',item.createdAt,'registration'));
    for (const state of item.conditionHistory ?? []) add(event(item,'condition',state.recordedAt,state.id));
  }
  for (const item of items) {
    if (isFood(item)) continue;
    const old = before.find(e => e.id === item.id);
    if (!old) continue;
    if (old.storage !== item.storage) add(event(item,'storage',now.toISOString()));
    if ((item.remainingPercent ?? 100) < (old.remainingPercent ?? 100) && (item.remainingPercent ?? 100) > 0) add(event(item,'partial',now.toISOString()));
  }
  for (const record of history) {
    if (!record.id || !Number.isFinite(Date.parse(record.recordedAt))) continue;
    const original = [...before,...items].find(i => i.id === record.id);
    if (record.kind === 'food' || (original && isFood(original))) continue;
    const known = [...map.values()].find(e => e.itemId === record.id && e.type === 'registered');
    const category = record.category ?? original?.category ?? known?.category ?? '분류 정보 없음';
    if (!known) add({id:`registered:${record.id}:registration`,itemId:record.id,type:'registered',name:record.name,category,at:record.createdAt ?? record.recordedAt,legacy:!record.createdAt});
    add({id:`terminal:${record.id}`,itemId:record.id,type:record.action,name:record.name,category,at:record.recordedAt,expiry:record.expiryDate || original?.date || undefined,legacy:!record.createdAt && !known});
  }
  const result = [...map.values()];
  if (result.length !== existing.length) storage.setItem(ACTIVITY_KEY,JSON.stringify(result));
  return result;
}
