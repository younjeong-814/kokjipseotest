import {createRecipeSearch,parseBasicPage} from '../_shared/generated/recipes.ts';
Deno.serve(async(request:Request)=>{
 if(request.method!=='GET')return Response.json({error:'GET only'},{status:405});
 const key=Deno.env.get('FOOD_API_KEY')?.trim();
 if(!key)return Response.json({mafraKeyPresent:false});
 let provider:Record<string,unknown>={};
 try{
  const response=await fetch(`http://211.237.50.150:7080/openapi/${encodeURIComponent(key)}/json/Grid_20150827000000000226_1/1/1`,{redirect:'manual',signal:AbortSignal.timeout(10000)});
  provider={status:response.status};
  if(response.ok){const data=await response.json();const parsed=parseBasicPage(data);provider={...provider,total:parsed.total,rows:parsed.rows};}else await response.body?.cancel();
 }catch{provider={...provider,error:'connection_timeout_or_invalid_payload'};}
 let search:Record<string,unknown>={};
 try{
  const result=await createRecipeSearch(Deno.env.get('FOOD_SAFETY_API_KEY'),fetch,key)(['양파']);
  search={total:result.total,samples:result.recipes.map(r=>({id:r.id,name:r.name,time:r.time,difficulty:r.difficulty,metadata:r.metadata}))};
 }catch{search={error:'search_unavailable'};}
 return Response.json({mafraKeyPresent:true,provider,search},{headers:{'Cache-Control':'no-store'}});
});
