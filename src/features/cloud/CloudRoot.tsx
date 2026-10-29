import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authRedirectUrl, supabase } from './client';
import { ensureAnonymousSession } from './anonymous';
import { StorageContext } from './StorageContext';
import { CloudStorage, cacheKey, preservePendingBeforeReload } from './storage';
import { validateSnapshot } from './snapshot';

import { AccountContext } from './AccountContext';
import { ConnectionStatusIcon } from '../../components/ConnectionStatusIcon';

function download(name:string, value:string) {
  const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
function AccountBar({session,children}: {session:Session|null;children?:ReactNode}) {
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
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
    <div className="settings-profile"><span className="settings-avatar" aria-hidden="true">{session && !anonymous ? String(session.user.user_metadata.full_name || '나').slice(0,1) : '콕'}</span><div><span className="settings-section-label">{anonymous ? '로그인 없이 이용 중' : '내 계정'}</span><strong>{anonymous ? '임시 사용자의 냉장고' : session ? `${session.user.user_metadata.full_name || '나'}의 냉장고` : '내 냉장고를 다른 기기에서도 확인하세요'}</strong>
    {session?.user.email && <p className="account-email">{session.user.email}</p>}</div></div><div className="settings-account-actions">
    {!supabase ? <p>클라우드 연결이 아직 설정되지 않았어요. 현재는 이 브라우저에 저장돼요.</p> : session && !anonymous ? <button onClick={async()=>{const {error}=await supabase!.auth.signOut({scope:'local'});if(error)setError('로그아웃하지 못했어요. 다시 시도해 주세요.')}}>로그아웃</button> : <button disabled={busy} onClick={()=>void connectGoogle()}>{busy ? '연결 중이에요' : anonymous ? 'Google 계정 연결하기' : 'Google로 로그인'}</button>}
    {anonymous && <p>이 브라우저에서는 기록을 이어서 사용할 수 있어요. 사이트 데이터를 지우면 임시 계정을 다시 찾기 어려워요. Google 계정을 연결하면 다른 기기에서도 사용할 수 있어요.</p>}
    {anonymous && <button disabled={busy} onClick={async()=>{
      if(!window.confirm('기존 Google 계정의 기록을 불러옵니다. 현재 임시 계정의 기록은 자동으로 합치지 않아요. 계속할까요?'))return;
      setBusy(true);setError('');
      try{const result=await supabase!.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirectUrl(),scopes:'openid email profile'}});if(result.error)throw result.error;}
      catch{setError('기존 계정에 로그인하지 못했어요. 다시 시도해 주세요.');}
      finally{setBusy(false);}
    }}>이미 사용 중인 Google 계정으로 로그인</button>}
    {error&&<p role="alert">{error}</p>}</div>{children}
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
