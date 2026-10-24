import {createRecipeSearch,RecipeApiError} from '../_shared/generated/recipes.ts';
import {securedHandler,HttpError} from '../_shared/http.ts';
const env=Deno.env.toObject();
const search=createRecipeSearch(env.FOOD_SAFETY_API_KEY,fetch,env.FOOD_API_KEY);
Deno.serve(securedHandler(env,'recipes','GET',async(request)=>{
  const url=new URL(request.url),page=Number(url.searchParams.get('page')??1);
  if(env.EXTERNAL_API_MODE==='mock')return {mode:'mock',recipes:[],total:0,page,pageSize:30};
  if(!env.FOOD_SAFETY_API_KEY)throw new HttpError(503,'레시피 서버의 FOOD_SAFETY_API_KEY 설정이 필요해요.');
  try{return await search(url.searchParams.getAll('ingredient'),page)}catch(e){if(e instanceof RecipeApiError)throw new HttpError(e.status,e.message);throw e}
}));
