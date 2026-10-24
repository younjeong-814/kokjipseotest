import { snapshotKeys, validateSnapshot, type AppStorage, type CloudSnapshot, type Snapshot } from './snapshot';
type Cache = {revision:number;snapshot:Snapshot;pending:boolean;extras:Record<string,string>};
export const cacheKey = (id: string) => `kokjipseo.cloud.${id}.v1`;
export function preservePendingBeforeReload(disk:AppStorage,owner:string) {
  const raw=disk.getItem(cacheKey(owner));if(!raw)return;
  const cache=JSON.parse(raw) as Cache;
  disk.setItem(`${cacheKey(owner)}.conflict.${Date.now()}`,raw);
  disk.setItem(cacheKey(owner),JSON.stringify({...cache,pending:false}));
}
/** Durable outbox: never replaces another account's storage or guest records. */
export class CloudStorage implements AppStorage {
  private cache: Cache;
  private dirty: () => void;
  private lastPersisted: string | null;
  readonly changed = new EventTarget();
  constructor(private disk: AppStorage, private owner: string, remote: CloudSnapshot, onDirty: () => void) {
    validateSnapshot(remote);
    this.dirty = onDirty;
    const raw = disk.getItem(cacheKey(owner));
    this.lastPersisted = raw;
    const cached = raw ? JSON.parse(raw) as Cache : null;
    if (cached) validateSnapshot({...cached.snapshot,revision:cached.revision});
    if (cached?.pending && cached.revision !== remote.revision) throw new Error('다른 기기의 변경과 미전송 기록이 충돌했어요. 이 기기의 기록을 백업한 뒤 다시 불러와 주세요.');
    this.cache = cached?.pending ? cached : {revision:remote.revision,snapshot:{ingredients:remote.ingredients,history:remote.history,activities:remote.activities,recipes:remote.recipes},pending:false,extras:cached?.extras ?? {}};
    this.persist(this.cache);
  }
  private persist(next: Cache) {
    if(this.disk.getItem(cacheKey(this.owner))!==this.lastPersisted)throw new Error('다른 탭에서 계정 기록이 변경됐어요. 새로고침 후 다시 시도해 주세요.');
    const serialized=JSON.stringify(next);
    this.disk.setItem(cacheKey(this.owner),serialized);this.lastPersisted=serialized;this.cache=next;
  }
  getItem(key: string) {
    const field = (Object.keys(snapshotKeys) as (keyof Snapshot)[]).find(k => snapshotKeys[k]===key);
    return field ? JSON.stringify(this.cache.snapshot[field]) : this.cache.extras[key] ?? null;
  }
  setItem(key: string, value: string) {
    const field = (Object.keys(snapshotKeys) as (keyof Snapshot)[]).find(k => snapshotKeys[k]===key);
    if (!field) {this.persist({...this.cache,extras:{...this.cache.extras,[key]:value}});return;}
    if (this.getItem(key) === value) return;
    const snapshot = {...this.cache.snapshot,[field]:JSON.parse(value)};
    validateSnapshot({...snapshot,revision:this.cache.revision});
    this.persist({...this.cache,snapshot,pending:true});
    this.changed.dispatchEvent(new Event('change'));
    this.dirty();
  }
  get revision() {return this.cache.revision;}
  get pending() {return this.cache.pending;}
  snapshot() {return JSON.parse(JSON.stringify(this.cache.snapshot)) as Snapshot;}
  acknowledge(revision: number, sent: Snapshot) {
    if (!Number.isSafeInteger(revision) || revision !== this.cache.revision+1) throw new Error('저장 버전을 확인할 수 없어요.');
    const pending = JSON.stringify(sent)!==JSON.stringify(this.cache.snapshot);
    this.persist({...this.cache,revision,pending});
  }
}
