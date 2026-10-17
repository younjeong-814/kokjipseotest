import { useEffect, useState } from 'react';
import { updateIngredientInfo } from './repository';
import type { IngredientInfoPatch } from './IngredientEditModal';
import { deleteIngredient, INGREDIENTS_KEY, loadIngredients, saveIngredient, updateIngredientDetails, recordIngredientCondition, saveRecognizedIngredients, type IngredientCondition, type Ingredient, type IngredientDraft } from './repository';

export function useIngredients() {
  const [state, setState] = useState<{ items: Ingredient[]; error: string }>(() => {
    try { return { items: loadIngredients(localStorage), error: '' }; }
    catch { return { items: [], error: '저장된 데이터를 읽을 수 없습니다. 브라우저 저장 설정을 확인해 주세요.' }; }
  });
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== INGREDIENTS_KEY && event.key !== null) return;
      try { setState({ items: loadIngredients(localStorage), error: '' }); }
      catch { setState(previous => ({ ...previous, error: '저장된 데이터를 읽을 수 없습니다. 기존 데이터는 덮어쓰지 않습니다.' })); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return {
    ...state,
    updateInfo: (id: string, patch: IngredientInfoPatch) => {
      try { setState({ items: updateIngredientInfo(localStorage, id, patch), error: '' }); }
      catch (error) { throw new Error(error instanceof Error ? error.message : '저장하지 못했어요.'); }
    },
    updateDetails: (id: string, patch: { storage: string; date: string; dateSource?: 'manual' | 'automatic'; remainingPercent: number; remainingAdjusted?: boolean }) => {
      try { setState({ items: updateIngredientDetails(localStorage, id, patch), error: '' }); }
      catch { throw new Error('저장하지 못했어요. 저장 공간과 항목 상태를 확인해 주세요.'); }
    },
    recordCondition: (id: string, status: IngredientCondition) => {
      try { setState({ items: recordIngredientCondition(localStorage, id, status), error: '' }); }
      catch { throw new Error('상태를 저장하지 못했어요. 다시 시도해 주세요.'); }
    },
    saveRecognized: (drafts: IngredientDraft[]) => {
      try { setState({ items: saveRecognizedIngredients(localStorage, drafts), error: '' }); }
      catch { throw new Error('인식한 재료를 저장하지 못했어요. 다시 시도해 주세요.'); }
    },
    save: (draft: IngredientDraft, id?: string) => {
      try { setState({ items: saveIngredient(localStorage, draft, id), error: '' }); }
      catch (error) { throw new Error(error instanceof Error && error.message.includes('항목') ? error.message : '저장하지 못했어요. 브라우저 저장 공간과 설정을 확인해 주세요.'); }
    },
    remove: (id: string) => {
      try { setState({ items: deleteIngredient(localStorage, id), error: '' }); }
      catch { throw new Error('삭제하지 못했어요. 브라우저 저장 공간과 설정을 확인해 주세요.'); }
    },
  };
}
