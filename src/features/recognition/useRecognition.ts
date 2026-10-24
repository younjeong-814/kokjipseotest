import { useState } from 'react';
import type { ReceiptResult } from '../receipt/parseReceipt';
import { categoryImage } from '../ingredients/images';
import { classifyIngredient, matchIngredient } from '../ingredients/classify';

export type RecognizedItem = { id: number; name: string; quantity: number; category: string; image: string; error: boolean; corrected: boolean };

// Figma prototype variables name0..name3 and visible/item0..item3. 인식 결과가 들어오기 전 기본값이다.
const sampleItems: RecognizedItem[] = [
  { id: 0, name: '대퍄', quantity: 1, category: '채소', image: 'thumb-vegetable.png', error: true, corrected: false },
  { id: 1, name: '양파', quantity: 1, category: '채소', image: 'thumb-vegetable.png', error: false, corrected: false },
  { id: 2, name: '두부', quantity: 1, category: '두부·콩류', image: 'thumb-bean.png', error: false, corrected: false },
  { id: 3, name: '콩', quantity: 1, category: '두부·콩류', image: 'thumb-bean.png', error: false, corrected: false },
];

const pad = (value: number) => String(value).padStart(2, '0');
const now = () => {
  const date = new Date();
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
};

export function useRecognition() {
  const [source, setSource] = useState<'sample' | 'receipt' | 'camera'>('sample');
  const [items, setItems] = useState(sampleItems);
  const [editing, setEditing] = useState('0');
  const [pendingName, setPendingName] = useState('대파');
  const [date, setDate] = useState('2026-08-08');
  const [time, setTime] = useState('10:49');
  const start = (next: RecognizedItem[], at: { date: string; time: string }) => {
    setItems(next);
    setEditing(String(next[0]?.id ?? 0));
    setPendingName(next[0]?.name ?? '');
    setDate(at.date);
    setTime(at.time);
  };
  return {
    source, items, editing, pendingName, date, time, setDate, setTime,
    selectEdit: (id: number) => {
      setEditing(String(id));
      setPendingName(items.find(item => item.id === id)?.name ?? '');
    },
    saveName: (id: number, value: string) => {
      const name = value.trim();
      if (!name) return;
      // 이름이 바뀌면 카테고리와 썸네일도 다시 정한다.
      const category = classifyIngredient(name);
      setItems(current => current.map(item => item.id === id ? { ...item, name, category, image: categoryImage(category), corrected: true } : item));
      setPendingName(name);
    },
    remove: (id: number) => setItems(current => current.filter(item => item.id !== id)),
    showSample: () => { setSource('sample'); start(sampleItems, now()); },
    // 냉장고 칸·상품 촬영은 이름만 인식하므로 수량은 1개로 둔다.
    showDetected: (names: string[]) => {
      setSource('camera');
      start(names.map((name, id) => {
        const category = classifyIngredient(name);
        return { id, name, quantity: 1, category, image: categoryImage(category), error: !matchIngredient(name), corrected: false };
      }), now());
    },
    showReceipt: (result: ReceiptResult) => {
      const at = now();
      setSource('receipt');
      start(result.items.map((item, id) => {
        const category = classifyIngredient(item.name);
        // 사전에 없는 이름은 오인식일 수 있으니 확인하도록 표시한다.
        return { id, name: item.name, quantity: item.quantity, category, image: categoryImage(category), error: item.suspicious || !matchIngredient(item.name), corrected: false };
      }), { date: result.date ?? at.date, time: result.time ?? at.time });
    },
  };
}
