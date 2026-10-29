import {useEffect,useState} from 'react';
import {supabase} from '../cloud/client';
import {setUTParticipation} from './client';
export function UTParticipationControl({userId}:{userId:string}){
  const [active,setActive]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let live=true;void(async()=>{
    try{const result=await supabase!.from('ut_participants').select('status').eq('user_id',userId).maybeSingle();if(result.error)throw result.error;if(live){setActive(result.data?.status==='active');setReady(true);}}
    catch{if(live)setError('UT 동의 설정을 불러오지 못했어요.');}
  })();return()=>{live=false;};},[userId]);
  return <section className="settings-ut-consent"><h2>UT 참여 및 행동 기록</h2><p>동의하면 앱 접속·알림 링크 재방문·재료 상세 확인·관리 행동의 종류와 시간을 임시 ID에 연결해 기록해요. 이메일 알림 동의와 별개이며, 철회 후에는 새 행동을 기록하지 않아요.</p>
    <button type="button" disabled={!ready||busy} onClick={async()=>{setBusy(true);setError('');try{await setUTParticipation(!active);setActive(v=>!v);}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}}}>{busy?'저장 중이에요':active?'UT 참여 및 행동 기록 동의 철회':'동의하고 UT 참여하기'}</button>
    {error&&<p role="alert">{error}</p>}</section>;
}
