import { useEffect, useState } from 'react';
import type { Recipe } from '../recipe/types';
import { useAppStorage } from './StorageContext';
import { CloudStorage } from './storage';
import { isSavedRecipe, SAVED_RECIPES_KEY } from './snapshot';
export function useSavedRecipes() {
  const storage=useAppStorage();
  const [items,setItems]=useState<Recipe[]>([]);const [error,setError]=useState('');
  useEffect(()=>{const read=()=>{try{const value=JSON.parse(storage.getItem(SAVED_RECIPES_KEY)??'[]');if(!Array.isArray(value)||!value.every(isSavedRecipe))throw new Error();setItems(value);setError('')}catch{setError('저장 레시피를 읽지 못했어요.')}};read();window.addEventListener('kokjipseo:recipes-changed',read);window.addEventListener('storage',read);if(storage instanceof CloudStorage)storage.changed.addEventListener('change',read);return()=>{window.removeEventListener('kokjipseo:recipes-changed',read);window.removeEventListener('storage',read);if(storage instanceof CloudStorage)storage.changed.removeEventListener('change',read)}},[storage]);
  return {items,error,toggle:(recipe:Recipe)=>{try{const value=JSON.parse(storage.getItem(SAVED_RECIPES_KEY)??'[]');if(!Array.isArray(value)||!value.every(isSavedRecipe))throw new Error();const next=value.some((r:Recipe)=>r.id===recipe.id)?value.filter((r:Recipe)=>r.id!==recipe.id):[recipe,...value];storage.setItem(SAVED_RECIPES_KEY,JSON.stringify(next));window.dispatchEvent(new Event('kokjipseo:recipes-changed'));setError('')}catch{setError('레시피를 저장하지 못했어요. 다시 시도해 주세요.')}}};
}
export function SavedRecipesPanel() {
  const saved=useSavedRecipes();
  return <details><summary>저장한 레시피 {saved.items.length}개</summary>{saved.error&&<p role="alert">{saved.error}</p>}{saved.items.map(recipe=><button key={recipe.id} onClick={()=>window.dispatchEvent(new CustomEvent('kokjipseo:open-saved-recipe',{detail:recipe}))}>{recipe.name}</button>)}</details>;
}
