import type {Env} from './http.ts';
import {validEmail, type MailTransport} from './emailNotifications.ts';

const base64=(value:string)=>btoa(Array.from(new TextEncoder().encode(value),b=>String.fromCharCode(b)).join(''));
export const encodeGmailRaw=(value:string)=>base64(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function reportFailure(response:Response,stage:'oauth'|'send'){
  const data=await response.json().catch(()=>null);
  const known=['invalid_grant','invalid_client','unauthorized_client','access_denied','insufficientPermissions','accessNotConfigured','dailyLimitExceeded','rateLimitExceeded','SERVICE_DISABLED','ACCESS_TOKEN_SCOPE_INSUFFICIENT'];
  const candidates=[data?.error,data?.error?.status,...(data?.error?.errors??[]).map((e:{reason?:string})=>e.reason),...(data?.error?.details??[]).map((e:{reason?:string})=>e.reason)];
  console.warn('gmail_delivery_failure',JSON.stringify({stage,status:response.status,reason:candidates.find(v=>typeof v==='string'&&known.includes(v))??'unclassified'}));
}

/** Gmail has no provider idempotency guarantee: do not attach this to the retrying reminder worker. */
export function createGmailVerificationTransport(env:Env,fetcher:typeof fetch=fetch):MailTransport|null {
  const {GMAIL_CLIENT_ID:clientId,GMAIL_CLIENT_SECRET:clientSecret,GMAIL_REFRESH_TOKEN:refreshToken,GMAIL_SENDER_EMAIL:sender}=env;
  if(!clientId||!clientSecret||!refreshToken||!sender||!validEmail(sender))return null;
  let cached:{token:string;expires:number}|null=null;
  let refreshing:Promise<string>|null=null;
  const accessToken=async()=>{
    if(cached&&cached.expires>Date.now()+60_000)return cached.token;
    if(refreshing)return refreshing;
    refreshing=(async()=>{
      const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10_000)});
      if(!response.ok){await reportFailure(response,'oauth');throw new Error('gmail_authorization_failed');}
      const data=await response.json();
      if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw new Error('gmail_authorization_failed');
      cached={token:data.access_token,expires:Date.now()+data.expires_in*1000};return cached.token;
    })();
    try{return await refreshing;}finally{refreshing=null;}
  };
  return async(mail)=>{
    if(mail.kind!=='verification')throw new Error('gmail_reminder_dispatch_not_enabled');
    if(!validEmail(mail.to)||!/^\d{6}$/.test(mail.code))throw new Error('invalid_verification_mail');
    const subject='[콕집서] 이메일 인증번호 안내';
    const body=`콕집서 이메일 인증번호는 ${mail.code}입니다.\n\n5분 이내에 입력해 주세요.\n직접 요청하지 않았다면 이 메일을 무시해 주세요.\n인증번호를 다른 사람에게 알려주지 마세요.`;
    const raw=encodeGmailRaw([
      `From: =?UTF-8?B?${base64('콕집서')}?= <${sender}>`,`To: ${mail.to}`,
      `Subject: =?UTF-8?B?${base64(subject)}?=`,'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',
      base64(body).match(/.{1,76}/g)!.join('\r\n'),
    ].join('\r\n'));
    const token=await accessToken();
    const response=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(15_000)});
    // Never retry an ambiguous send automatically, or expose Google's response (tokens/PII).
    if(!response.ok){if(response.status===401)cached=null;await reportFailure(response,'send');throw new Error('gmail_send_failed');}
    const result=await response.json();if(typeof result.id!=='string')throw new Error('gmail_send_unconfirmed');
  };
}
