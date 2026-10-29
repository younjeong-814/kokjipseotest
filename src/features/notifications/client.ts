import {supabase} from '../cloud/client';
export const EMAIL_CONSENT_VERSION='email-reminders-v1';
export type NotificationSettings={email:string|null;email_verified_at:string|null;enabled:boolean;consent_at:string|null};
export const preferencesChanged=()=>window.dispatchEvent(new Event('kokjipseo:notification-preferences-changed'));
export async function readNotificationSettings(userId:string):Promise<NotificationSettings|null>{
  if(!supabase)return null;
  const {data,error}=await supabase.from('email_notification_settings').select('email,email_verified_at,enabled,consent_at').eq('user_id',userId).maybeSingle();
  if(error)throw new Error('알림 설정을 불러오지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.');
  return data;
}
export async function setRemindersEnabled(enabled:boolean){
  if(!supabase)throw new Error('계정 연결을 확인해 주세요.');
  const {error}=await supabase.rpc('set_email_reminders_enabled',{p_enabled:enabled});
  if(error)throw new Error('알림 설정을 저장하지 못했어요. 이전 설정을 유지해요.');
  preferencesChanged();
}
export async function setUTParticipation(accepted:boolean){
  if(!supabase)throw new Error('계정 연결을 확인해 주세요.');
  const {error}=await supabase.rpc('set_ut_participation',{p_accepted:accepted});
  if(error)throw new Error('UT 동의 정보를 저장하지 못했어요. 다시 시도해 주세요.');
  preferencesChanged();
}
async function verification(body:Record<string,unknown>){
  if(!supabase)throw new Error('계정 연결을 확인해 주세요.');
  const {data,error}=await supabase.functions.invoke('email-verification',{body});
  if(error){
    let message='이메일 인증 연결을 준비 중이거나 연결할 수 없어요. 인증이 완료된 상태는 아니에요.';
    if(error.context instanceof Response){try{const reply=await error.context.json();if(typeof reply.error==='string')message=reply.error;}catch{/* Do not expose raw upstream error details. */}}
    throw new Error(message);
  }
  if(data?.error)throw new Error(data.error);
  return data;
}
export async function requestEmailCode(email:string){
  const data=await verification({action:'request-code',email,consent:true,consentVersion:EMAIL_CONSENT_VERSION});
  if(typeof data?.requestId!=='string'||!Number.isFinite(Date.parse(data.expiresAt)))throw new Error('인증 요청 결과를 확인하지 못했어요.');
  return data as {requestId:string;expiresAt:string};
}
export async function verifyEmailCode(requestId:string,code:string){
  const data=await verification({action:'verify-code',requestId,code});
  if(data?.ok!==true)throw new Error('이메일 인증을 완료하지 못했어요.');
  preferencesChanged();
}
export function isEmail(value:string){return value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
