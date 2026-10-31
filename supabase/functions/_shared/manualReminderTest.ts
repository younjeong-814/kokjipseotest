import { createReminderWorker, type MailTransport } from './emailNotifications.ts';
import type { Env } from './http.ts';

export function createManualReminderTest(env:Env, transport:MailTransport|null, fetcher:typeof fetch=fetch) {
  return async(request:Request) => {
    const origin=request.headers.get('Origin');
    const allowed=(env.ALLOWED_ORIGINS??'http://127.0.0.1:5173,http://localhost:5173,https://younjeong-814.github.io').split(',').map(value=>value.trim());
    const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'});
    if(origin&&allowed.includes(origin))headers.set('Access-Control-Allow-Origin',origin);
    const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
    if(origin&&!allowed.includes(origin))return reply(403,{error:'허용되지 않은 사이트예요.'});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply(405,{error:'POST 요청만 지원해요.'});
    if(env.EMAIL_MANUAL_TEST_ENABLED!=='true')return reply(403,{error:'테스트 기능이 꺼져 있어요.'});
    try {
      const auth=request.headers.get('Authorization');
      if(!auth?.startsWith('Bearer '))return reply(401,{error:'로그인이 필요해요.'});
      if(!env.SUPABASE_URL||!(env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY)||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,{error:'테스트 서버 설정을 확인해 주세요.'});
      const identity=await fetcher(`${env.SUPABASE_URL}/auth/v1/user`,{headers:{Authorization:auth,apikey:(env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY)!},signal:AbortSignal.timeout(10000)});
      if(!identity.ok)return reply(401,{error:'로그인이 만료됐어요.'});
      const user=await identity.json();
      if(typeof user.id!=='string'||!user.id)return reply(401,{error:'계정 연결을 확인해 주세요.'});
      const raw=await request.text();
      if(raw.length>256)return reply(413,{error:'요청이 너무 길어요.'});
      let action:string;try { const input=JSON.parse(raw);if(!input||Object.keys(input).some(key=>key!=='action'))return reply(400,{error:'본인 계정으로만 테스트할 수 있어요.'});action=input.action; } catch { return reply(400,{error:'요청을 확인해 주세요.'}); }
      const sending=Boolean(transport&&env.EMAIL_DISPATCH_ENABLED==='true'&&env.EMAIL_CRON_SECRET);
      if(action==='status')return reply(200,{enabled:true,sendingReady:sending});
      const db=async(name:string)=>{
        const res=await fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY!,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:user.id}),signal:AbortSignal.timeout(15000)});
        if(!res.ok)throw new Error('rpc_failed');return res.json();
      };
      if(action==='inspect'){
        await db('refresh_email_notification_schedule_for_user');
        return reply(200,{mode:'inspection',sendingReady:sending,users:await db('inspect_email_notification_targets_for_user')});
      }
      if(action!=='run')return reply(400,{error:'지원하지 않는 요청이에요.'});
      if(!sending)return reply(503,{error:'메일 제공자 또는 발송 허용 설정이 준비되지 않았어요. 메일은 발송하지 않았어요.'});
      if(!await db('claim_email_manual_test_run_for_user'))return reply(429,{error:'중복 실행을 막기 위해 1분 뒤 다시 실행할 수 있어요.'});
      const worker=createReminderWorker(env,transport,fetcher,user.id);
      const response=await worker(new Request('https://internal/reminder-worker',{method:'POST',headers:{'x-cron-secret':env.EMAIL_CRON_SECRET!}}));
      if(!response.ok)return reply(503,{error:'처리 결과를 확인하지 못했어요. 일부 메일은 발송됐을 수 있으므로 발송 기록을 확인해 주세요.'});
      return reply(200,await response.json());
    } catch { return reply(503,{error:'테스트 요청을 처리하지 못했어요. 연결과 서버 설정을 확인해 주세요.'}); }
  };
}
