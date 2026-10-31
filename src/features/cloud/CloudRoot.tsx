import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authRedirectUrl, supabase } from './client';
import { ensureAnonymousSession } from './anonymous';
import { StorageContext } from './StorageContext';
import { CloudStorage, cacheKey, preservePendingBeforeReload } from './storage';
import { validateSnapshot } from './snapshot';

import { AccountContext } from './AccountContext';
import { ConnectionStatusIcon } from '../../components/ConnectionStatusIcon';
import { asset } from '../../lib/assets';
import {useNotificationSettings} from '../notifications/useNotificationSettings';
import {UTTracker,recordManagedActivity} from '../notifications/UTTracker';

function download(name:string, value:string) {
  const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
function AccountBar({session,children}: {session:Session|null;children?:ReactNode}) {
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const reminders=useNotificationSettings(session?.user.id);
  const reminderEmail=reminders.settings?.email_verified_at ? reminders.settings.email : '';
  const reminderEnabled=Boolean(reminders.settings?.enabled);
  const anonymous=Boolean(session?.user.is_anonymous);
  const connectGoogle=async()=>{
    if(!supabase || busy)return;
    setError('');setBusy(true);
    try {
      const options={redirectTo:authRedirectUrl(),scopes:'openid email profile'};
      const result=anonymous
        ? await supabase.auth.linkIdentity({provider:'google',options})
        : await supabase.auth.signInWithOAuth({provider:'google',options});
      if(result.error)throw result.error;
    }catch{setError('Google 계정을 연결하지 못했어요. 이미 연결된 계정이거나 연결 설정을 확인해야 할 수 있어요. 현재 기록은 자동으로 합치지 않아요.');}
    finally{setBusy(false);}
  };
  return <section className="cloud-account" aria-label="계정 및 클라우드 저장">
    <div className={`settings-profile${reminderEmail ? ' is-reminder-active' : ''}`}><span className="settings-avatar" aria-hidden="true">{session && !anonymous ? String(session.user.user_metadata.full_name || '나').slice(0,1) : '콕'}</span><div className="settings-profile-copy"><span className="settings-section-label">{reminderEmail ? '이메일 알림 이용 중' : anonymous ? '로그인 없이 이용 중' : '내 계정'}</span><strong>{anonymous ? '임시 사용자의 냉장고' : session ? `${session.user.user_metadata.full_name || '나'}의 냉장고` : '내 냉장고를 다른 기기에서도 확인하세요'}</strong>
    <p className="settings-profile-status">{anonymous ? (reminderEmail ? 'Google 계정 미연결' : '계정 연결 전') : session ? '계정 연결됨' : '브라우저에 저장 중'}</p>{session?.user.email && <p className="account-email">{session.user.email}</p>}</div></div>
    <section className="settings-notifications" aria-labelledby="settings-notifications-title">
      <div className="settings-section-heading"><h2 id="settings-notifications-title">소비 권장일 알림</h2><p>소비 권장일이 다가오는 식재료를 이메일로 알려드려요.</p></div>
      {reminderEmail ? <div className="settings-email-preferences">
        <div className="settings-confirmed-email">
          <span>알림 받을 이메일</span>
          <div><strong>{reminderEmail}</strong><span className="settings-email-badge"><span className="settings-email-badge-icon"><img src={asset('status-success-mark.svg')} alt="" /></span>인증 완료</span></div>
        </div>
        <div className="settings-email-toggle-row">
          <span><strong>이메일 알림 받기</strong><small>소비 권장일 3일 전, 1일 전, 당일에 안내드려요.</small></span>
          <button type="button" className={`settings-email-toggle${reminderEnabled ? ' is-on' : ''}`} role="switch" aria-checked={reminderEnabled} aria-label="이메일 알림 받기" disabled={reminders.busy} onClick={()=>void reminders.toggle()}><span /></button>
        </div>
        <button type="button" className="settings-email-change" onClick={()=>window.dispatchEvent(new Event('kokjipseo:open-email-reminder'))}>알림 이메일 변경<img src={asset('home-list-chevron.svg')} alt="" /></button>
      </div> : <div className="settings-notice-card">
        <div className="settings-notice-copy"><span className="settings-round-icon" aria-hidden="true"><span className="settings-icon-slot"><img src={asset('notification-bell.svg')} alt="" /></span></span><div><strong>이메일로 알림을 받아보세요</strong><p>냉장고 속 식재료의 소비 권장일이<br />다가오면 이메일로 미리 알려드려요.</p></div></div>
        <button type="button" className="settings-email-button" onClick={()=>window.dispatchEvent(new Event('kokjipseo:open-email-reminder'))}>이메일로 알림 신청하기</button>
        <p className="settings-schedule"><img src={asset('detail-calendar.svg')} alt="" />소비 권장일 3일 전, 1일 전, 당일에 안내드려요.</p>
      </div>}
      {reminderEmail && <aside className="settings-notification-info"><span aria-hidden="true">i</span><div><strong>어떤 알림을 받나요?</strong><p>보관 중인 재료의 소비 권장일이 다가오면<br />이메일로 알려드려요. 소비 기록·상태 변경은<br />메일 알림으로 보내지 않아요.</p></div></aside>}
      {reminders.error&&<p role="alert">{reminders.error}<button type="button" onClick={()=>void reminders.reload()}>알림 설정 다시 불러오기</button></p>}
    </section>
    <section className="settings-records" aria-labelledby="settings-records-title">
      <h2 id="settings-records-title">내 기록 보관하기</h2>
      <div className="settings-record-card">
        <div className="settings-record-copy"><span className="settings-round-icon" aria-hidden="true"><span className="settings-icon-slot"><img src={asset('cloud-upload.svg')} alt="" /></span></span><p>이 브라우저에서 기록을 이용 중이에요.<br />Google 계정을 연결하면 다른 기기에서도<br className="settings-desktop-break" />내 냉장고를 이어서 사용할 수 있어요.</p></div>
        {!supabase ? <p className="settings-cloud-unavailable">클라우드 연결이 아직 설정되지 않았어요.</p> : session && !anonymous ? <button type="button" className="settings-google-button" onClick={async()=>{const {error}=await supabase!.auth.signOut({scope:'local'});if(error)setError('로그아웃하지 못했어요. 다시 시도해 주세요.')}}>로그아웃</button> : <button type="button" className="settings-google-button" disabled={busy} onClick={()=>void connectGoogle()}>{busy ? '연결 중이에요' : 'Google 계정 연결하기'}</button>}
      </div>
      <div className="settings-retention-note"><span aria-hidden="true">i</span><p>계정을 연결하기 전에 브라우저의 사이트 데이터를 삭제하면, 기존 기록을 다시 찾기 어려워요.</p></div>
    </section>
    {error&&<p role="alert">{error}</p>}{children}
  </section>;
}
function SignedInStorage({session,children}:{session:Session;children:ReactNode}) {
  const [storage,setStorage]=useState<CloudStorage|null>(null);
  const [error,setError]=useState('');const [status,setStatus]=useState('불러오는 중이에요');
  const [retry,setRetry]=useState(0);
  const trigger=useRef<()=>void>(()=>{});
  useEffect(()=>{
    let cancelled=false, running=false, stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
    let store:CloudStorage;
    const observedActivities=new Set<string>();
    const schedule=()=>{if(cancelled||stopped)return;setStatus('저장 대기 중이에요');clearTimeout(timer);timer=setTimeout(()=>void flush(),350)};
    const flush=async()=>{
      if(cancelled||stopped||running||!store?.pending)return;
      running=true;setStatus('클라우드에 저장 중이에요');
      const sent=store.snapshot();
      let succeeded=false;
      try {
        const {data,error}=await supabase!.rpc('save_fridge_snapshot',{expected_revision:store.revision,snapshot:sent});
        if(error)throw error;
        if(cancelled)return;
        store.acknowledge(data,sent);succeeded=true;setError('');setStatus(store.pending?'저장 대기 중이에요':'변경한 내용을 저장했어요');
        for(const raw of sent.activities){
          const activity=raw as {id:string;itemId:string;type:string};
          if(!observedActivities.has(activity.id)){
            observedActivities.add(activity.id);
            if(activity.type!=='registered')void recordManagedActivity(session.user.id,activity).catch(()=>{});
          }
        }
      } catch(e) {
        const conflict=Boolean(e&&typeof e==='object'&&'message' in e&&String(e.message).includes('revision_conflict'));
        stopped=conflict;
        setError(conflict?'다른 기기에서 데이터가 변경됐어요. 자동 덮어쓰기를 중단했어요. 이 기기 기록을 백업한 뒤 다시 연결해 주세요.':'클라우드 저장에 실패했어요. 이 기기에는 보관 중이며 재시도할 수 있어요.');
        setStatus('아직 서버에 저장되지 않았어요');
      } finally {running=false;}
      if(!cancelled&&!stopped&&store.pending&&succeeded) schedule();
    };
    trigger.current=()=>{stopped=false;void flush()};
    void (async()=>{
      try {
        const {data,error}=await supabase!.rpc('load_fridge_snapshot');if(error)throw error;
        if(cancelled)return;
        store=new CloudStorage(localStorage,session.user.id,validateSnapshot(data),schedule);
        for(const raw of validateSnapshot(data).activities)observedActivities.add((raw as {id:string}).id);
        setStorage(store);setError('');setStatus(store.pending?'저장 대기 중이에요':'내 냉장고가 연결됐어요');if(store.pending)schedule();
      }catch{if(!cancelled)setError('계정 데이터를 불러오지 못했어요. DB 설정·연결을 확인해 주세요. 미전송 기록이 있다면 먼저 백업해 주세요.');}
    })();
    const retrySave=()=>{if(!stopped)void flush()};window.addEventListener('online',retrySave);
    return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('online',retrySave)};
  },[session.user.id,retry]);
  const backup=()=>download('kokjipseo-cloud-backup.json',localStorage.getItem(cacheKey(session.user.id))??'{}');
  const reloadRemote=()=>{try{preservePendingBeforeReload(localStorage,session.user.id);setStorage(null);setError('');setRetry(n=>n+1)}catch{setError('미전송 기록을 별도 보관하지 못했어요. 먼저 파일로 백업해 주세요.')}};
  if(!storage) return <main className="cloud-account"><p role={error?'alert':'status'}>{error||'계정의 냉장고를 불러오는 중이에요'}</p>{error&&<><button onClick={backup}>이 기기 기록 백업</button><button onClick={()=>setRetry(n=>n+1)}>다시 연결</button><button onClick={reloadRemote}>미전송 기록 별도 보관 후 서버 다시 불러오기</button>{!session.user.is_anonymous && <button onClick={()=>void supabase!.auth.signOut({scope:'local'})}>로그아웃</button>}</>}</main>;
  return <StorageContext.Provider value={storage}>
    <AccountContext.Provider value={<AccountBar session={session}>
      <div className={`settings-sync-status${error ? ' has-error' : ''}`}>
        {error || !storage.pending ? <ConnectionStatusIcon error={Boolean(error)} /> : null}
        <p role={error ? 'alert' : 'status'}>{error || status}</p>
      </div><h2 className="settings-section-title">데이터 관리</h2><div className="settings-data-actions">
      <button onClick={()=>trigger.current()}>저장 재시도</button>
      <button onClick={backup}>이 기기 기록 백업</button>
      {error&&<button onClick={reloadRemote}>미전송 기록 별도 보관 후 서버 다시 불러오기</button>}
      
    </div></AccountBar>}>
    {children}
    <UTTracker userId={session.user.id}/>
    {error&&<aside className="cloud-save-warning" role="alert">{error}<button onClick={backup}>기록 백업</button></aside>}
    </AccountContext.Provider>
  </StorageContext.Provider>;
}
export function CloudRoot({children}:{children:ReactNode}) {
  const [session,setSession]=useState<Session|null>(null);
  const [ready,setReady]=useState(!supabase);const [error,setError]=useState('');
  const initialize=useCallback(async()=>{
    if(!supabase)return;
    setError('');setReady(false);
    try{setSession(await ensureAnonymousSession(supabase));
    }catch{setError('임시 계정을 준비하지 못했어요. 연결 상태와 Supabase 익명 로그인 설정을 확인한 뒤 다시 시도해 주세요. 기존 기록은 그대로 보관돼요.');}
    finally{setReady(true);}
  },[]);
  useEffect(()=>{
    if(!supabase)return;void initialize();
    const {data}=supabase.auth.onAuthStateChange((event,next)=>{
      if(next){setSession(next);setReady(true);setError('');}
      else if(event==='SIGNED_OUT'){
        setSession(null);setReady(false);
        // Run outside the auth callback's internal lock.
        setTimeout(()=>void initialize(),0);
      }
    });
    return()=>data.subscription.unsubscribe();
  },[initialize]);
  if(!ready)return <main className="cloud-account" role="status">로그인 상태를 확인하고 있어요</main>;
  if(supabase && !session)return <main className="cloud-account"><p role="alert">{error}</p><button onClick={()=>void initialize()}>다시 시도</button></main>;
  if(session)return <SignedInStorage key={session.user.id} session={session}>{children}</SignedInStorage>;
  return <StorageContext.Provider key="guest" value={null}><AccountContext.Provider value={<AccountBar session={null}></AccountBar>}>{error&&<p role="alert">{error}</p>}{children}</AccountContext.Provider></StorageContext.Provider>;
}
