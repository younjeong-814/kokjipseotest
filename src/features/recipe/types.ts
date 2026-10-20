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
