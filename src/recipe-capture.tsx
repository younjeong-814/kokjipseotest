import React from 'react';
import { createRoot } from 'react-dom/client';
import { RecipeResultsPage } from './features/recipe/RecipeResultsPage';
import { previewRecipeResults } from './features/recipe/previewRecipe';
import { StatusBar } from './components/StatusBar';
import { BottomNavigation } from './components/BottomNavigation';
import './styles/tokens.css'; import './styles/global.css'; import './styles/screens.css'; import './styles/recipe-results.css';
createRoot(document.getElementById('root')!).render(<div className="app-shell"><StatusBar/><RecipeResultsPage recipes={previewRecipeResults} selectedIngredients={['토마토','우유']} onBack={()=>{window.location.href='/#recipe'}}/><BottomNavigation screen="recipe-results" navigate={screen=>{window.location.href=`/#${screen}`}}/></div>);
