import { useEffect, useMemo, useState } from 'react';
import { ActionButton } from '../../components/ActionButton';
import { asset } from '../../lib/assets';
import { deadlineLabel } from '../ingredients/expiry';
import type { Ingredient } from '../ingredients/repository';
import { defaultRecipeSelection, selectRecipeIngredients } from './selectRecipeIngredients';

type Props = { items: Ingredient[]; initialSelected?: string[]; onRecommend?: (selected: Ingredient[]) => void };

// Figma 3061:14914 레시피 첫 화면 - 재료 선택
export function RecipePage({ items, initialSelected, onRecommend }: Props) {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setToday(new Date()); };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);
  const entries = useMemo(() => selectRecipeIngredients(items, today), [items, today]);
  const [selected, setSelected] = useState(() => new Set(initialSelected ?? defaultRecipeSelection(entries)));
  // 삭제된 재료는 선택에서 뺀다.
  useEffect(() => { setSelected(previous => new Set([...previous].filter(id => entries.some(entry => entry.item.id === id)))); }, [entries]);
  const toggle = (id: string) => setSelected(previous => {
    const next = new Set(previous);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  const selectedItems = entries.filter(entry => selected.has(entry.item.id)).map(entry => entry.item);

  return <main className="recipe-page" data-figma-node="3061:14914">
    <div className="recipe-content">
      <section className="recipe-ingredients-header" aria-label="내 냉장고 재료">
        <h2>내 냉장고 재료</h2>
        <div>
          <button type="button" disabled={!selected.size} onClick={() => setSelected(new Set())}>모두 취소</button>
          <button type="button" disabled={!entries.length || selected.size === entries.length} onClick={() => setSelected(new Set(entries.map(entry => entry.item.id)))}>모두 선택</button>
        </div>
      </section>
      {entries.length
        ? <ul className="recipe-chips" aria-label="소비기한 임박 재료">
          {entries.map(({ item, days }) => {
            const on = selected.has(item.id);
            return <li key={item.id}>
              <button type="button" className={`recipe-chip${on ? ' selected' : ''}`} aria-pressed={on} aria-label={`${item.name} ${deadlineLabel(days)}`} onClick={() => toggle(item.id)}>
                <span>{item.name}</span>{on && <img src={asset('recipe-chip-check.svg')} alt="" width={24} height={24} />}
              </button>
            </li>;
          })}
        </ul>
        : <p className="recipe-chips-empty">소비기한이 3일 이내로 남은 재료가 없어요.</p>}
    </div>
    {entries.length > 0 && <section className="recipe-banner-section" aria-label="안내">
      <div className="recipe-banner">
        <h2>임박 재료로 레시피를 추천해요</h2>
        <p>보관 중인 재료의 소비기한을 확인해,<br />먼저 사용하면 좋은 재료를 기준으로 레시피를 추천해요</p>
      </div>
    </section>}
    <div className="large-button-section">
      <ActionButton className="action-button-large" disabled={!selectedItems.length} onClick={() => onRecommend?.(selectedItems)}>레시피 추천받기</ActionButton>
    </div>
  </main>;
}
