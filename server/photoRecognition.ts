import type {IncomingMessage,ServerResponse} from 'node:http';
import {imageBody,HttpError} from '../supabase/functions/_shared/http';
import {recognizePhoto} from '../supabase/functions/_shared/photo';
/** Local-only adapter; deployed browsers call the authenticated Edge Function. */
export function photoRecognitionMiddleware(key:string|undefined,model:string|undefined) {
  return async(req:IncomingMessage,res:ServerResponse)=>{
    const send=(status:number,data:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
    if(req.method!=='POST')return send(405,{error:'POST만 지원해요.'});
    if(!key||!model)return send(503,{error:'사진 인식 서버 설정이 필요해요. GEMINI_API_KEY와 GEMINI_MODEL을 설정해 주세요.'});
    try{
      const chunks:Uint8Array[]=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>6*1024*1024)return send(413,{error:'사진 크기를 줄여 주세요.'});chunks.push(chunk)}
      const request=new Request('http://localhost/api/recognize',{method:'POST',body:Buffer.concat(chunks)});
      const {image,mode}=await imageBody(request);if(mode!=='fridge'&&mode!=='product')throw new HttpError(400,'촬영 방식을 확인해 주세요.');
      send(200,{items:await recognizePhoto(key,model,image,mode)});
    }catch(e){send(e instanceof HttpError?e.status:502,{error:e instanceof HttpError?e.message:'사진 인식 서비스에 연결하지 못했어요.'})}
  };
}
