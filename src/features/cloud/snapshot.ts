import { INGREDIENTS_KEY, loadIngredients } from '../ingredients/repository';
import { REPORT_HISTORY_KEY } from '../report/weeklyReport';
import { ACTIVITY_KEY, readActivities } from '../mypage/activityLog';
export const SAVED_RECIPES_KEY = 'kokjipseo.saved-recipes.v1';
export const snapshotKeys = {ingredients:INGREDIENTS_KEY,history:REPORT_HISTORY_KEY,activities:ACTIVITY_KEY,recipes:SAVED_RECIPES_KEY} as const;
export type Snapshot = {ingredients: unknown[];history: unknown[];activities: unknown[];recipes: unknown[]};
export type CloudSnapshot = {revision:number} & Snapshot;
export type AppStorage = Pick<Storage,'getItem'|'setItem'>;
export const emptySnapshot = (): Snapshot => ({ingredients:[],history:[],activities:[],recipes:[]});
export function validateSnapshot(value: unknown): CloudSnapshot {
  const data = value as CloudSnapshot;
  if (!data || !Number.isSafeInteger(data.revision) || data.revision < 0 || !Object.keys(snapshotKeys).every(k => Array.isArray(data[k as keyof Snapshot]) && data[k as keyof Snapshot].length <= 10000)) throw new Error('클라우드 데이터 형식이 올바르지 않아요.');
  const json = (key: string) => JSON.stringify(data[(Object.keys(snapshotKeys) as (keyof Snapshot)[]).find(k => snapshotKeys[k]===key)!] ?? []);
  loadIngredients({getItem:json,setItem:()=>{throw new Error('read only');}});
  readActivities({getItem:json,setItem:()=>{throw new Error('read only');}});
  if (!data.history.every((r: any) => r && typeof r.id === 'string' && typeof r.name === 'string' && ['consumed','discarded'].includes(r.action) && Number.isFinite(Date.parse(r.recordedAt)))) throw new Error('소비·폐기 이력을 읽지 못했어요.');
  if (!data.recipes.every(isSavedRecipe)) throw new Error('저장 레시피를 읽지 못했어요.');
  return data;
}
export function isSavedRecipe(r: any): boolean {
  return Boolean(r && ['id','name','image','summary','category','calories','time','difficulty','servings'].every(k=>typeof r[k]==='string') && Array.isArray(r.ingredients) && r.ingredients.every((i: any) => i && typeof i.name==='string' && typeof i.amount==='string') && Array.isArray(r.steps) && r.steps.every((s: any) => s && typeof s.text==='string'));
}
export function snapshotFromStorage(storage: AppStorage): Snapshot {
  const result = Object.fromEntries(Object.entries(snapshotKeys).map(([name,key]) => [name,JSON.parse(storage.getItem(key) ?? '[]')])) as Snapshot;
  validateSnapshot({...result,revision:0});
  return result;
}
export function mergeSnapshots(remote: Snapshot, guest: Snapshot): Snapshot {
  return Object.fromEntries((Object.keys(snapshotKeys) as (keyof Snapshot)[]).map(k => [k,[...new Map([...guest[k],...remote[k]].map((r:any) => [r.id,r])).values()]])) as Snapshot;
}
