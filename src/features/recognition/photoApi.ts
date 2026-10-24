import { requestExternal } from '../cloud/externalRequests';
export type PhotoRecognitionItem={name:string;category:string;quantity:number;uncertain:boolean};
export async function recognizeIngredientPhoto(image:string,mode:'fridge'|'product'):Promise<PhotoRecognitionItem[]> {
  let response:Response;
  try{response=await requestExternal('recognize','/api/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,mode})})}
  catch(e){if(e instanceof Error&&e.message.includes('로그인'))throw e;throw new Error('사진 인식 서버에 연결하지 못했어요. 다시 촬영하거나 직접 입력해 주세요.')}
  const data=await response.json().catch(()=>null);
  if(data?.mode==='mock')throw new Error('사진 인식은 모의 연결 상태예요. 실제 인식 서버 설정 후 다시 촬영해 주세요.');
  if(!response.ok)throw new Error(data?.error||'사진을 인식하지 못했어요. 다시 촬영하거나 직접 입력해 주세요.');
  if(!Array.isArray(data?.items)||data.items.length>30||!data.items.every((i:PhotoRecognitionItem)=>i&&typeof i.name==='string'&&i.name.trim()&&i.name.length<=60&&typeof i.category==='string'&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=100&&typeof i.uncertain==='boolean'))throw new Error('사진 인식 결과를 읽지 못했어요. 다시 촬영해 주세요.');
  if(!data.items.length)throw new Error('사진에서 식재료를 찾지 못했어요. 밝은 곳에서 다시 촬영하거나 직접 입력해 주세요.');
  return data.items;
}
