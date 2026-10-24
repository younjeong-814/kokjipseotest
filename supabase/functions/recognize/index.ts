import {securedHandler,imageBody,HttpError} from '../_shared/http.ts';
import {recognizePhoto} from '../_shared/photo.ts';
const env=Deno.env.toObject();
Deno.serve(securedHandler(env,'recognize','POST',async(request)=>{
  const {image,mode}=await imageBody(request);
  if(!['fridge','product'].includes(mode??''))throw new HttpError(400,'촬영 방식을 확인해 주세요.');
  if(env.EXTERNAL_API_MODE==='mock')return {mode:'mock',items:[]};
  if(!env.GEMINI_API_KEY||!env.GEMINI_MODEL)throw new HttpError(503,'사진 인식 서버의 GEMINI_API_KEY와 GEMINI_MODEL 설정이 필요해요.');
  return {items:await recognizePhoto(env.GEMINI_API_KEY,env.GEMINI_MODEL,image,mode!)};
}));
