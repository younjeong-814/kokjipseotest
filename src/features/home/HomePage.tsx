import { WelcomeBanner } from './WelcomeBanner';
import { FridgeSummary } from './FridgeSummary';
import { EmptyFridge } from './EmptyFridge';
import type { Navigate } from '../../prototype/flow';
import type { Ingredient } from '../ingredients/repository';
import { useEffect, useState } from 'react';
import { HomeIngredientList } from './HomeIngredientList';
import { selectHomeIngredients } from './selectHomeIngredients';
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
  return <main data-figma-node={!items.length ? '5558:18818' : selection.mode === 'urgent' ? '3061:12522' : '3139:2332'}><WelcomeBanner hasIngredients={items.length > 0} /><FridgeSummary items={items} />{items.length ? <HomeIngredientList selection={selection} onOpen={onOpen} /> : <EmptyFridge onRegister={() => navigate('registration')} />}</main>;
}
