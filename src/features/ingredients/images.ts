// 카테고리별 썸네일 (Figma Thumnails 5038:7314). 냉장고 목록과 인식 결과 화면이 같이 쓴다.
const categoryImages: Record<string, string> = {
  '육류': 'thumb-meat.png',
  '과일': 'thumb-fruit.png',
  '채소': 'thumb-vegetable.png',
  '두부·콩류': 'thumb-bean.png',
  '유제품': 'thumb-dairy.png',
  '수산물': 'thumb-fish.png',
  '조미료': 'thumb-sauce.png',
  '가공식품': 'thumb-processed.png',
};

export const categoryImage = (category: string) => categoryImages[category] ?? 'thumb-ingredients-etc.png';
