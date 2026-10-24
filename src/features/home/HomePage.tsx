import { WelcomeBanner } from './WelcomeBanner';
import { FridgeSummary } from './FridgeSummary';
import { EmptyFridge } from './EmptyFridge';
import type { Navigate } from '../../prototype/flow';
import type { Ingredient } from '../ingredients/repository';
import { useEffect, useState } from 'react';
import { HomeIngredientList } from './HomeIngredientList';
import { selectHomeIngredients } from './selectHomeIngredients';
import { ExpiringIngredientsModal } from './ExpiringIngredientsModal';
import { deadlineDays, deadlineLabel } from '../ingredients/expiry';
import { toDateKey } from '../../lib/date';
export function HomePage({ navigate, items, onOpen }: { navigate: Navigate; items: Ingredient[]; onOpen: (item: Ingredient) => void }) {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const nextDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const timeout = window.setTimeout(() => setToday(new Date()), Math.max(0, nextDay.getTime() - Date.now()) + 100);
    const refresh = () => { if (document.visibilityState === 'visible') setToday(new Date()); };
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearTimeout(timeout); document.removeEventListener('visibilitychange', refresh); };
  }, [today]);
  const selection = selectHomeIngredients(items, today);
  const urgent = items.map(item => ({ item, days: deadlineDays(item.date, toDateKey(today)) }))
    .filter((entry): entry is { item: Ingredient; days: number } => entry.days !== null && entry.days <= 3)
    .sort((a, b) => {
      // Expired items come first, oldest expiry first; then upcoming items, nearest expiry first.
      const expiryPriority = (days: number) => days < 0 ? days : days + 4;
      return expiryPriority(a.days) - expiryPriority(b.days)
        || (a.item.remainingPercent ?? 100) - (b.item.remainingPercent ?? 100)
        || a.item.id.localeCompare(b.item.id);
    })
    .slice(0, 3);
  return <><main data-figma-node={!items.length ? '5558:18818' : selection.mode === 'urgent' ? '3061:12522' : '3139:2332'}><WelcomeBanner hasIngredients={items.length > 0} hasUrgentIngredients={selection.mode === 'urgent'} /><FridgeSummary items={items} />{items.length ? <HomeIngredientList selection={selection} onOpen={onOpen} /> : <EmptyFridge onRegister={() => navigate('registration')} />}</main>{urgent.length > 0 && <ExpiringIngredientsModal entries={urgent} onOpenFridge={() => { try { sessionStorage.setItem('kokjipseo:fridge-sort', '소비기한:asc'); } catch { /* 정렬 전달 실패와 관계없이 냉장고로 이동 */ } navigate('fridge'); }} />}</>;
}
