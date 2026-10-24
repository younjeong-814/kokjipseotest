import {annotateImage} from '../_shared/generated/vision.ts';
import {securedHandler,imageBody,HttpError} from '../_shared/http.ts';
const env=Deno.env.toObject();
Deno.serve(securedHandler(env,'ocr','POST',async(request)=>{
  const {image}=await imageBody(request);
  if(env.EXTERNAL_API_MODE==='mock')return {mode:'mock',words:[]};
  if(!env.GOOGLE_VISION_API_KEY)throw new HttpError(503,'OCR 서버의 GOOGLE_VISION_API_KEY 설정이 필요해요.');
  return {words:await annotateImage(env.GOOGLE_VISION_API_KEY,image)};
}));
