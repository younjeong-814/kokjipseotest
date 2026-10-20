export type RecipeIngredient = { id: string; name: string; amount: string };
export type RecipeDetail = {
  id: string;
  title: string;
  imageUrl: string;
  time?: string;
  difficulty?: string;
  servings?: string;
  ingredients: readonly RecipeIngredient[];
  steps: readonly string[];
};

export type RecipeSummary = Pick<RecipeDetail, 'id' | 'title' | 'imageUrl' | 'time' | 'difficulty'> & { tags: readonly string[] };
export type Recipe = {
  id: string;
  name: string;
  summary: string;
  category: string;
  image: string;
  calories: string;
  time: string;
  difficulty: string;
  servings: string;
  ingredients: { name: string; amount: string; type: string }[];
  steps: { text: string; image: string; tip: string }[];
};
export type RecipeSearchResult = { recipes: Recipe[]; total: number; page: number; pageSize: number };
