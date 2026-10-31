import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';
const modules=new Map();
function load(path){const url=new URL(path,import.meta.url);if(modules.has(url.href))return modules.get(url.href);const exports={};modules.set(url.href,exports);const code=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('exports','require',code)(exports,p=>load(new URL(p,url)));return exports;}
const {createVerificationHandler,createReminderWorker,hashVerification,validEmail}=load('../supabase/functions/_shared/emailNotifications.ts');
const db=new PGlite();
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
const ingredient='20000000-0000-4000-8000-000000000001',reqid='30000000-0000-4000-8000-000000000001';
const hash='a'.repeat(64);
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
 for(const file of ['202610240001_ingredient_storage.sql','202610240002_cloud_snapshot.sql','202610240003_api_budget.sql','202610240004_revision_validation.sql','202610290001_email_foundation.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.query('insert into auth.users values($1),($2)',[a,b]);
});
after(()=>db.close());
async function asUser(id,fn){await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);try{return await fn();}finally{await db.exec('reset role');}}
test('migration compiles; direct browser writes/hash reads and service RPC access are blocked',async()=>{
 await asUser(a,async()=>{
  await assert.rejects(()=>db.query('insert into public.email_notification_settings(user_id,email,email_verified_at,enabled,consent_at,consent_version) values($1,$2,now(),true,now(),$3)',[a,'forged@example.com','email-reminders-v1']),/permission denied/);
  await assert.rejects(()=>db.query('select token_hash from public.email_change_requests'),/permission denied/);
  await assert.rejects(()=>db.query('select public.refresh_email_notification_schedule()'),/permission denied/);
  await assert.rejects(()=>db.query('select public.verify_email_change_request($1,$2,$3)',[a,reqid,hash]),/permission denied/);
 });
});
test('email challenge: old address survives mismatch, wrong owner, expiry and unsent; success is one-time',async()=>{
 await db.query("insert into public.email_notification_settings(user_id,email,email_verified_at,enabled,consent_at,consent_version) values($1,'old@example.com',now(),true,now(),'email-reminders-v1')",[a]);
 await db.query('select public.create_email_change_request($1,$2,$3,$4)',[a,reqid,'new@example.com',hash]);
 const verify=async(owner=a,h=hash)=>(await db.query('select public.verify_email_change_request($1,$2,$3) as result',[owner,reqid,h])).rows[0].result;
 assert.equal((await verify()).ok,false);
 await db.query("update public.email_change_requests set delivery_status='sent' where id=$1",[reqid]);
 assert.equal((await verify(b)).ok,false);assert.equal((await verify(a,'b'.repeat(64))).reason,'mismatch');
 assert.equal((await db.query('select email from public.email_notification_settings where user_id=$1',[a])).rows[0].email,'old@example.com');
 await db.query("update public.email_change_requests set expires_at=now()-interval '1 second' where id=$1",[reqid]);assert.equal((await verify()).reason,'expired');
 await db.query("update public.email_change_requests set expires_at=now()+interval '1 minute' where id=$1",[reqid]);assert.equal((await verify()).ok,true);assert.equal((await verify()).ok,false);
 assert.equal((await db.query('select email from public.email_notification_settings where user_id=$1',[a])).rows[0].email,'new@example.com');
 await asUser(b,async()=>assert.equal((await db.query('select * from public.email_notification_settings')).rows.length,0));
});
test('wrong codes stop after five attempts; cooldown is database-enforced',async()=>{
 await db.query("update public.email_change_requests set created_at=now()-interval '2 minutes' where user_id=$1",[a]);
 const id='30000000-0000-4000-8000-000000000002';
 await db.query('select public.create_email_change_request($1,$2,$3,$4)',[a,id,'another@example.com',hash]);
 await assert.rejects(()=>db.query('select public.create_email_change_request($1,$2,$3,$4)',[a,crypto.randomUUID(),'another@example.com',hash]),/resend_cooldown/);
 await db.query("update public.email_change_requests set delivery_status='sent' where id=$1",[id]);
 for(let i=0;i<5;i++)assert.equal((await db.query('select public.verify_email_change_request($1,$2,$3) as r',[a,id,'b'.repeat(64)])).rows[0].r.reason,'mismatch');
 assert.equal((await db.query('select public.verify_email_change_request($1,$2,$3) as r',[a,id,hash])).rows[0].r.reason,'locked');
});
test('KST D-3/D-1/day scheduling is unique; changed date, deletion and opt-out cancel jobs',async()=>{
 await db.query(`insert into public.ingredients(id,user_id,name,category,expiry_date,payload) values($1::uuid,$2::uuid,'양파','채소',(now() at time zone 'Asia/Seoul')::date+3,jsonb_build_object('id',$1::text,'name','양파','category','채소'))`,[ingredient,a]);
 await db.query('select public.refresh_email_notification_schedule()');await db.query('select public.refresh_email_notification_schedule()');
 let rows=(await db.query('select * from public.email_notification_deliveries where user_id=$1',[a])).rows;assert.equal(rows.length,3);
 assert.equal(new Date(rows.find(r=>r.reminder_type==='3_days').scheduled_at).getUTCHours(),0);
 await db.query("update public.ingredients set expiry_date=expiry_date+1 where user_id=$1",[a]);await db.query('select public.refresh_email_notification_schedule()');
 assert.equal((await db.query("select count(*)::int as n from public.email_notification_deliveries where status='cancelled'")).rows[0].n,3);
 await asUser(a,()=>db.query('select public.set_email_reminders_enabled(false)'));
 assert.equal((await db.query("select count(*)::int as n from public.email_notification_deliveries where status in ('pending','processing','failed')")).rows[0].n,0);
 await asUser(a,()=>db.query('select public.set_email_reminders_enabled(true)'));await db.query('select public.refresh_email_notification_schedule()');
 await db.query('delete from public.ingredients where user_id=$1',[a]);await db.query('select public.refresh_email_notification_schedule()');
 assert.equal((await db.query("select count(*)::int as n from public.email_notification_deliveries where status='pending'")).rows[0].n,0);
});
test('UT events require active consent, idempotency and delivery ownership',async()=>{
 const key=crypto.randomUUID();
 await asUser(a,async()=>{
  assert.equal((await db.query("select public.record_ut_event($1,'app_open') as ok",[key])).rows[0].ok,false);
  await db.query('select public.set_ut_participation(true)');
  for(let i=0;i<2;i++)assert.equal((await db.query("select public.record_ut_event($1,'app_open') as ok",[key])).rows[0].ok,true);
  assert.equal((await db.query('select count(*)::int as n from public.ut_events')).rows[0].n,1);
  assert.equal((await db.query("select public.record_ut_event($1,'notification_click',null,$2) as ok",[crypto.randomUUID(),crypto.randomUUID()])).rows[0].ok,false);
  await db.query('select public.set_ut_participation(false)');assert.equal((await db.query("select public.record_ut_event($1,'app_open') as ok",[crypto.randomUUID()])).rows[0].ok,false);
 });
});
test('queue leases prevent duplicate claims, retries stop at three, and eligibility is checked before send',async()=>{
 const item='20000000-0000-4000-8000-000000000002';
 await db.query(`insert into public.ingredients(id,user_id,name,category,expiry_date,payload) values($1::uuid,$2::uuid,'두부','두부·콩류',(now() at time zone 'Asia/Seoul')::date+3,jsonb_build_object('id',$1::text,'name','두부','category','두부·콩류'))`,[item,a]);
 await db.query('select public.refresh_email_notification_schedule()');
 await db.query("update public.email_notification_deliveries set scheduled_at=now()-interval '1 second' where ingredient_id=$1 and reminder_type='3_days'",[item]);
 const claim=async()=>(await db.query('select * from public.claim_email_deliveries()')).rows;
 for(let attempt=1;attempt<=3;attempt++){
  const rows=await claim();assert.equal(rows.length,1);const job=rows[0];assert.equal(job.attempt_count,attempt);
  assert.equal((await claim()).length,0);
  const current=(await db.query('select public.prepare_email_delivery($1,$2) as data',[job.id,job.lease_token])).rows[0].data;assert.equal(current.email,'new@example.com');
  await db.query('select public.finish_email_delivery($1,$2,false)',[job.id,job.lease_token]);
  await db.query("update public.email_notification_deliveries set next_attempt_at=now()-interval '1 second' where id=$1",[job.id]);
 }
 assert.equal((await claim()).length,0);
 await db.query('delete from public.ingredients where id=$1',[item]);
 await db.query('select public.refresh_email_notification_schedule()');
});

const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'PRIVATE',EMAIL_VERIFICATION_PEPPER:'PRIVATE-PEPPER',EMAIL_CRON_SECRET:'PRIVATE-CRON'};
const request=body=>new Request('https://x',{method:'POST',headers:{Authorization:'Bearer user-token',Origin:'http://localhost:5174'},body:JSON.stringify(body)});
test('verification validates user and never claims sent/verified without provider; no keys leak',async()=>{
 let calls=0;const handler=createVerificationHandler(env,null,async()=>{calls++;return Response.json({id:a})});
 assert.equal((await handler(new Request('https://x',{method:'POST'}))).status,401);
 const response=await handler(request({action:'request-code',email:'tester@example.com',consent:true,consentVersion:'email-reminders-v1'}));
 assert.equal(response.status,503);assert.equal(calls,1);assert.doesNotMatch(await response.text(),/PRIVATE|user-token/);
 assert.equal((await handler(request({action:'request-code',email:'bad@',consent:true,consentVersion:'email-reminders-v1'}))).status,400);
 assert.equal(validEmail('a@example.com\r\nBcc:spam'),false);
 assert.notEqual(await hashVerification(a,reqid,'123456','pepper'),await hashVerification(b,reqid,'123456','pepper'));
});
test('server generates and hashes code, derives owner, sends then marks sent; response contains no code',async()=>{
 const calls=[];let mail;
 const handler=createVerificationHandler(env,async m=>{mail=m;},async(url,init)=>{
  calls.push({url,body:init?.body&&JSON.parse(init.body)});
  if(url.endsWith('/user'))return Response.json({id:a});
  if(url.endsWith('create_email_change_request'))return Response.json(new Date(Date.now()+300000).toISOString());
  return new Response(null,{status:204});
 });
 const response=await handler(request({action:'request-code',user_id:b,email:'tester@example.com',consent:true,consentVersion:'email-reminders-v1'}));
 const result=await response.json();assert.equal(response.status,200);assert.match(mail.code,/^\d{6}$/);assert.equal(result.code,undefined);
 const create=calls.find(c=>c.url.endsWith('create_email_change_request'));assert.equal(create.body.p_user_id,a);assert.equal(create.body.p_hash.length,64);assert.notEqual(create.body.p_hash,mail.code);
 assert.equal(calls.at(-1).body.delivery_status,'sent');
});
test('worker rejects browser token; planning-only never claims or marks sent; dispatch rechecks eligibility',async()=>{
 let calls=[];
 const fetcher=async(url)=>{calls.push(url);return Response.json(3);};
 const worker=createReminderWorker(env,null,fetcher);
 assert.equal((await worker(request({}))).status,401);assert.equal(calls.length,0);
 const cron=()=>new Request('https://x',{method:'POST',headers:{'x-cron-secret':env.EMAIL_CRON_SECRET}});
 assert.deepEqual(await (await worker(cron())).json(),{mode:'planning-only',planned:3,sent:0});assert.equal(calls.length,1);
 let sent=0;calls=[];
 const active=createReminderWorker({...env,EMAIL_DISPATCH_ENABLED:'true'},async()=>{sent++;},async url=>{
  calls.push(url);return Response.json(url.endsWith('claim_email_deliveries')?[{id:reqid,lease_token:'lease'}]:url.endsWith('prepare_email_delivery')?null:0);
 });
 const result=await (await active(cron())).json();assert.equal(sent,0);assert.equal(result.cancelled,1);assert.equal(calls.some(u=>u.endsWith('finish_email_delivery')),false);
});
test('Resend transport stays off without secrets and sends the rendered reminder with the idempotency key',async()=>{
 const {createResendTransport}=load('../supabase/functions/_shared/emailTransport.ts');
 assert.equal(createResendTransport({RESEND_API_KEY:'k'}),null);
 const calls=[];
 const transport=createResendTransport({RESEND_API_KEY:'k',EMAIL_FROM:'콕집서 <a@example.com>'},async(url,init)=>{calls.push({url,init});return new Response('{}');});
 await transport({kind:'reminder',to:'tester@example.com',name:'두부',expiryDate:'2026-11-03',ingredientId:ingredient,deliveryId:reqid,reminderType:'3_days'},'reminder:x');
 const body=JSON.parse(calls[0].init.body);
 assert.equal(calls[0].url,'https://api.resend.com/emails');assert.equal(calls[0].init.headers['Idempotency-Key'],'reminder:x');
 assert.deepEqual(body.to,['tester@example.com']);assert.match(body.html,/두부/);assert.match(body.subject,/3일 남은/);
 await transport({kind:'reminder',to:'tester@example.com',name:'두부',expiryDate:'2026-11-03',ingredientId:ingredient,deliveryId:reqid,reminderType:'1_day'},'reminder:y');
 assert.match(JSON.parse(calls[1].init.body).subject,/1일 남은/);
 await transport({kind:'reminder',to:'tester@example.com',name:'두부',expiryDate:'2026-11-03',ingredientId:ingredient,deliveryId:reqid,reminderType:'due_today'},'reminder:z');
 const today=JSON.parse(calls[2].init.body);assert.match(today.subject,/오늘까지인/);assert.match(today.text,/오늘까지인/);assert.doesNotMatch(today.html,/3일 남은/);
 const failing=createResendTransport({RESEND_API_KEY:'k',EMAIL_FROM:'a@example.com'},async()=>new Response('{}',{status:422}));
 await assert.rejects(()=>failing({kind:'reminder',to:'t@example.com',name:'x',expiryDate:'2026-11-03',ingredientId:ingredient,deliveryId:reqid,reminderType:'3_days'},'k'),/provider_422/);
});
test('reminder mail carries each user own address, ingredient name and expiry date',async()=>{
 const users=[['40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','user-c@example.com','청송사과',1],['40000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000002','user-d@example.com','시금치',0]];
 for(const [user,item,email,name,days] of users){
  await db.query('insert into auth.users values($1)',[user]);
  await db.query("insert into public.email_notification_settings(user_id,email,email_verified_at,enabled,consent_at,consent_version) values($1,$2,now(),true,now(),'email-reminders-v1')",[user,email]);
  await db.query(`insert into public.ingredients(id,user_id,name,category,expiry_date,payload) values($1::uuid,$2::uuid,$3,'과일',(now() at time zone 'Asia/Seoul')::date+$4::int,jsonb_build_object('id',$1::text,'name',$3::text,'category','과일'))`,[item,user,name,days]);
 }
 // 오늘 23:59 KST 기준으로 꺼내 시각과 무관하게 오늘 슬롯만 대상으로 만든다.
 const endOfToday="((now() at time zone 'Asia/Seoul')::date+time '23:59') at time zone 'Asia/Seoul'";
 await db.query(`select public.refresh_email_notification_schedule(${endOfToday})`);
 const {rows:jobs}=await db.query(`select id,lease_token from public.claim_email_deliveries(${endOfToday}) where user_id in ($1,$2)`,users.map(u=>u[0]));
 assert.equal(jobs.length,2);
 await db.query("update public.email_notification_deliveries set lease_until=now()+interval '5 minutes' where id=any($1)",[jobs.map(j=>j.id)]);
 const {createResendTransport}=load('../supabase/functions/_shared/emailTransport.ts');
 const sent=[];const transport=createResendTransport({RESEND_API_KEY:'k',EMAIL_FROM:'a@example.com'},async(url,init)=>{sent.push(JSON.parse(init.body));return new Response('{}');});
 for(const job of jobs){const {rows:[{mail}]}=await db.query('select public.prepare_email_delivery($1,$2) as mail',[job.id,job.lease_token]);await transport({kind:'reminder',to:mail.email,...mail},`reminder:${job.id}`);}
 const today=(await db.query("select to_char((now() at time zone 'Asia/Seoul')::date,'YYYY-MM-DD') as d")).rows[0].d;
 const tomorrow=(await db.query("select to_char((now() at time zone 'Asia/Seoul')::date+1,'YYYY-MM-DD') as d")).rows[0].d;
 const c=sent.find(m=>m.to[0]==='user-c@example.com'),d=sent.find(m=>m.to[0]==='user-d@example.com');
 assert.match(c.html,/청송사과/);assert.match(c.html,new RegExp(`${tomorrow}까지`));assert.match(c.subject,/1일 남은/);assert.doesNotMatch(c.html,/시금치/);
 assert.match(d.html,/시금치/);assert.match(d.html,new RegExp(`${today}까지`));assert.match(d.subject,/오늘까지인/);assert.doesNotMatch(d.html,/청송사과/);
});
