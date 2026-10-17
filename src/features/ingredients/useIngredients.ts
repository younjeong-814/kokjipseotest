import { useEffect, useState } from 'react';
import { deleteIngredient, INGREDIENTS_KEY, loadIngredients, saveIngredient, type Ingredient, type IngredientDraft } from './repository';

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
