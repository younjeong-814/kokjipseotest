// Original destination IDs from read-only Figma reaction inspection.
export const screens = {
  '5744:5719': { title: '레시피', menu: 3 },
  '5733:5582': { title: '직접 입력', menu: 2 },
  '5558:18818': { title: '오늘의 냉장고', menu: 0 },
  '5558:19292': { title: '냉장고', menu: 1 },
  '5558:19197': { title: '식재료 등록', menu: 2 },
  'guide-fridge': { title: '촬영 가이드', menu: 2 },
  '3061:13614': { title: '촬영 가이드', menu: 2 },
  '3372:3710': { title: '촬영 가이드', menu: 2 },
  'guide-product': { title: '촬영 가이드', menu: 2 },
  'guide-receipt': { title: '촬영 가이드', menu: 2 },
  'guide-manual': { title: '입력 가이드', menu: 2 },
  '5572:19475': { title: '촬영 가이드', menu: 2 },
  '5579:702': { title: '영수증 촬영', menu: 2 },
  '5572:19525': { title: '인식 결과 확인', menu: 2 },
  '5572:19852': { title: '냉장고', menu: 1 },
  '3061:13127': { title: '마이페이지', menu: 4 },
} as const;
export type ScreenId = keyof typeof screens;
export type Navigate = (destination: ScreenId) => void;
export function isScreenId(value: string): value is ScreenId {
  return Object.hasOwn(screens, value);
}
export const navigationDestinations: Record<ScreenId, readonly (string | null)[]> = {
  '5744:5719': ['5558:18818', '5558:19292', '5558:19197', null, '3061:12938'],
  '5733:5582': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  '3061:13614': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  '3372:3710': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  'guide-fridge': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  'guide-product': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  'guide-receipt': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  'guide-manual': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  '5558:18818': [null, '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  '5558:19292': ['5558:18818', null, '5558:19197', '5744:5719', '3061:13127'],
  '5558:19197': ['5558:18818', '5558:19292', null, '5744:5719', '3061:13127'],
  '5572:19475': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  '5579:702': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  '5572:19525': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  '5572:19852': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', '3061:13127'],
  '3061:13127': ['5558:18818', '5558:19292', '5558:19197', '5744:5719', null],
};
export const additionalConnections = {
  recognition: { source: '5580:758', destination: '5572:19525' },
  recognitionAlbum: { source: '5580:752', destination: '5572:19525' },
  recognitionRetake: { source: '5572:19564', destination: '5579:702' },
  recognitionRegister: { source: '5572:19565', destination: '5572:19852' },
  receipt: { source: '5558:19209', destination: '5558:19377' },
  search: { source: 'I5558:19294;5021:6884', destination: '5068:3030' },
} as const;
