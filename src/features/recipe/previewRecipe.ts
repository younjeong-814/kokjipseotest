import { asset } from '../../lib/assets';
import type { RecipeDetail } from './types';

// Figma 화면 검증용 데이터. API 연결 시 RecipeDetail로 변환한 응답으로 교체한다.
export const previewRecipe: RecipeDetail = {
  id: 'figma-tomato-eggs',
  title: '토마토 달걀볶음',
  imageUrl: asset('recipe-detail-tomato.png'),
  time: '15분 이내', difficulty: '초급', servings: '1인분',
  ingredients: [
    { id: 'tomato', name: '토마토', amount: '1개 (약 150~200g)' },
    { id: 'eggs', name: '계란', amount: '2알' },
    { id: 'green-onion', name: '대파', amount: '1/2대' },
    { id: 'parsley', name: '파슬리가루', amount: '1꼬집' },
    { id: 'oil', name: '식용유', amount: '1큰술 (약 15ml)' },
    { id: 'oyster-sauce', name: '굴소스', amount: '1T' },
  ],
  steps: [
    '토마토는 먹기 좋은 크기로 썰고, 달걀은 풀어 준비해요.',
    '팬에 식용유를 두르고 달걀을 스크램블 하듯 볶아 덜어둬요.',
    '같은 팬에 토마토와 굴소스를 넣고 볶아요.',
  ],
};

// 검색결과 디자인용 예시. 실제 검색/조리 데이터는 API 연결 시 교체한다.
export const previewRecipeResults = [
  { id: previewRecipe.id, title: previewRecipe.title, imageUrl: asset('recipe-result-eggs.png'), time: '15분 이내', difficulty: '초급', tags: ['우유', '토마토', '계란'] },
  { id: 'figma-tomato-soup', title: '토마토 마녀수프', imageUrl: asset('recipe-result-soup.png'), time: '15분 이내', difficulty: '초급', tags: ['우유', '토마토', '감자'] },
  { id: 'figma-tomato-pasta', title: '토마토 파스타', imageUrl: asset('recipe-result-pasta.png'), time: '15분 이내', difficulty: '초급', tags: ['우유', '토마토', '가지'] },
  { id: 'figma-tomato-juice', title: '토마토 주스', imageUrl: asset('recipe-result-juice.png'), time: '15분 이내', difficulty: '초급', tags: ['물', '토마토'] },
];
export const previewSelectedIngredients = ['토마토', '우유'];
export function getPreviewRecipe(id: string | null): RecipeDetail {
  if (!id || id === previewRecipe.id) return previewRecipe;
  const summary = previewRecipeResults.find(recipe => recipe.id === id);
  return summary ? { ...summary, ingredients: [], steps: [] } : previewRecipe;
}
