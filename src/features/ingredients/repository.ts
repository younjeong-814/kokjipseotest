export const INGREDIENTS_KEY = 'kokjipseo.manual-ingredients.v1';
export const categories = ['육류','과일','채소','두부·콩류','유제품','수산물','조미료','가공식품','기타'] as const;
export const storageLocations = ['냉장','냉동','실온'] as const;
export type IngredientDraft = { name: string; category: string; storage: string; quantity: number; unit: string; date: string };
export type Ingredient = IngredientDraft & { id: string; createdAt: string; updatedAt: string };
type LocalStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function validateDraft(draft: IngredientDraft): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 60) return '재료명을 1~60자로 입력해 주세요.';
  if (!categories.some(value => value === draft.category)) return '카테고리를 선택해 주세요.';
  if (!storageLocations.some(value => value === draft.storage)) return '보관 위치를 선택해 주세요.';
  if (!Number.isFinite(draft.quantity) || draft.quantity <= 0) return '수량을 0보다 큰 숫자로 입력해 주세요.';
  if (!draft.unit.trim() || draft.unit.trim().length > 10) return '수량 단위를 1~10자로 입력해 주세요.';
  if (draft.date) {
    const parsed = new Date(`${draft.date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== draft.date) return '올바른 소비 권장일을 선택해 주세요.';
  }
  return null;
}

export function loadIngredients(storage: LocalStorage): Ingredient[] {
  const raw = storage.getItem(INGREDIENTS_KEY);
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(item => item && typeof item === 'object' && ['name','category','storage','unit','date','id','createdAt','updatedAt'].every(key => typeof item[key] === 'string') && typeof item.quantity === 'number' && !validateDraft(item) && item.id && Number.isFinite(Date.parse(item.createdAt)) && Number.isFinite(Date.parse(item.updatedAt))) || new Set(data.map(item => item.id)).size !== data.length) throw new Error('Invalid ingredient storage');
  return data as Ingredient[];
}

export function saveIngredient(storage: LocalStorage, draft: IngredientDraft, id?: string): Ingredient[] {
  const error = validateDraft(draft);
  if (error) throw new Error(error);
  const items = loadIngredients(storage);
  const previous = id ? items.find(item => item.id === id) : undefined;
  if (id && !previous) throw new Error('다른 탭에서 삭제된 항목입니다. 목록을 다시 확인해 주세요.');
  const now = new Date().toISOString();
  const item: Ingredient = { ...draft, name: draft.name.trim(), unit: draft.unit.trim(), id: previous?.id ?? crypto.randomUUID(), createdAt: previous?.createdAt ?? now, updatedAt: now };
  const next = previous ? items.map(value => value.id === id ? item : value) : [item, ...items];
  storage.setItem(INGREDIENTS_KEY, JSON.stringify(next));
  return next;
}

export function deleteIngredient(storage: LocalStorage, id: string): Ingredient[] {
  const next = loadIngredients(storage).filter(item => item.id !== id);
  storage.setItem(INGREDIENTS_KEY, JSON.stringify(next));
  return next;
}
