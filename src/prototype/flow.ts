// Original destination IDs from read-only Figma reaction inspection.
export const screens = {
  '5558:18818': { title: '오늘의 냉장고', menu: 0 },
  '5558:19292': { title: '냉장고', menu: 1 },
  '5558:19197': { title: '식재료 등록', menu: 2 },
  'guide-fridge': { title: '촬영 가이드', menu: 2 },
  'guide-product': { title: '촬영 가이드', menu: 2 },
  'guide-receipt': { title: '촬영 가이드', menu: 2 },
  'guide-manual': { title: '입력 가이드', menu: 2 },
} as const;
export type ScreenId = keyof typeof screens;
export type Navigate = (destination: ScreenId) => void;
export function isScreenId(value: string): value is ScreenId {
  return Object.hasOwn(screens, value);
}
export const navigationDestinations: Record<ScreenId, readonly (string | null)[]> = {
  'guide-fridge': ['5558:18818', '5558:19292', '5558:19197', '3061:14914', '3061:12938'],
  'guide-product': ['5558:18818', '5558:19292', '5558:19197', '3061:14914', '3061:12938'],
  'guide-receipt': ['5558:18818', '5558:19292', '5558:19197', '3061:14914', '3061:12938'],
  'guide-manual': ['5558:18818', '5558:19292', '5558:19197', '3061:14914', '3061:12938'],
  '5558:18818': [null, '5558:19292', '5558:19197', '3061:14914', '3061:12938'],
  '5558:19292': ['5558:18818', null, '5558:19197', '3061:14914', '3061:12938'],
  '5558:19197': ['5558:18818', '5558:19292', null, '3061:14914', '3061:12938'],
};
export const additionalConnections = {
  receipt: { source: '5558:19209', destination: '5558:19377' },
  search: { source: 'I5558:19294;5021:6884', destination: '5068:3030' },
} as const;
