import { useState } from 'react';

// Figma prototype variables name0..name3 and visible/item0..item3.
export const recognizedItems = [
  { id: 0, name: '대퍄', image: 'ai-vegetable.png', error: true, vegetable: true },
  { id: 1, name: '양파', image: 'ai-vegetable.png', error: false, vegetable: true },
  { id: 2, name: '두부', image: 'ai-bean.png', error: false, vegetable: false },
  { id: 3, name: '콩', image: 'ai-bean.png', error: false, vegetable: false },
] as const;

export function useRecognition() {
  const [visible, setVisible] = useState([true, true, true, true]);
  const [editing, setEditing] = useState('0');
  const [pendingName, setPendingName] = useState('대파');
  const [names, setNames] = useState<string[]>(recognizedItems.map(item => item.name));
  const [corrected, setCorrected] = useState([false, false, false, false]);
  const [date, setDate] = useState('2026-08-08');
  const [time, setTime] = useState('10:49');
  return {
    visible, editing, pendingName, names, corrected, date, time, setDate, setTime,
    selectEdit: (id: number) => {
      setEditing(String(id));
      setPendingName(names[id]);
    },
    saveName: (id: number, value: string) => {
      const name = value.trim();
      if (!name) return;
      setNames(current => current.map((previous, index) => index === id ? name : previous));
      setCorrected(current => current.map((previous, index) => index === id ? true : previous));
      setPendingName(name);
    },
    remove: (id: number) => setVisible(items => items.map((value, index) => index === id ? false : value)),
    reset: () => setVisible([true, true, true, true]),
  };
}
