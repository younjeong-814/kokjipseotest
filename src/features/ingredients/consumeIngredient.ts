import { deleteIngredient, loadIngredients } from './repository';
import { recordDisposal, REPORT_HISTORY_KEY } from '../report/weeklyReport';

/** 명시적인 소비 완료. 최신 저장 내용을 읽어 중복 기록을 방지한다. */
export function consumeIngredient(storage: Pick<Storage, 'getItem' | 'setItem'>, id: string) {
  const item = loadIngredients(storage).find(value => value.id === id);
  if (!item) throw new Error('이미 삭제되거나 소비 완료된 항목이에요. 목록을 확인해 주세요.');
  const previousHistory = storage.getItem(REPORT_HISTORY_KEY);
  // 이력 저장 실패 시 목록에서 제거하지 않는다.
  recordDisposal(storage, item, new Date(), 'consumed');
  try { return deleteIngredient(storage, id); }
  catch (failure) {
    storage.setItem(REPORT_HISTORY_KEY, previousHistory ?? '[]');
    throw failure;
  }
}
