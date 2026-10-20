export type Recipe = {
  id: string;
  name: string;
  method: string;
  category: string;
  image: string;
  ingredients: string;
  calories: string;
  nutrition: { carbohydrate: string; protein: string; fat: string; sodium: string };
  steps: { text: string; image: string }[];
};
export type RecipeSearchResult = { recipes: Recipe[]; total: number; page: number; pageSize: number };
