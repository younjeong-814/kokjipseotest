import {useCallback,useEffect,useState} from 'react';
import {readNotificationSettings,setRemindersEnabled,type NotificationSettings} from './client';
export function useNotificationSettings(userId?:string){
  const [settings,setSettings]=useState<NotificationSettings|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  // 신청 여부를 확인하기 전에는 '신청하기' 안내를 보여주지 않는다(이미 신청한 사용자에게 잘못 노출되지 않도록).
  const [loaded,setLoaded]=useState(!userId);
  const reload=useCallback(async()=>{
    if(!userId){setSettings(null);setLoaded(true);return;}
    try{setSettings(await readNotificationSettings(userId));setError('');setLoaded(true);}catch(e){setError(e instanceof Error?e.message:'알림 설정을 불러오지 못했어요.');}
  },[userId]);
  useEffect(()=>{void reload();const refresh=()=>void reload();window.addEventListener('kokjipseo:notification-preferences-changed',refresh);return()=>window.removeEventListener('kokjipseo:notification-preferences-changed',refresh);},[reload]);
  const toggle=async()=>{if(busy||!settings)return;setBusy(true);try{await setRemindersEnabled(!settings.enabled);await reload();}catch(e){setError(e instanceof Error?e.message:'설정을 저장하지 못했어요.');}finally{setBusy(false);}};
  return {settings,loaded,error,busy,reload,toggle};
}
