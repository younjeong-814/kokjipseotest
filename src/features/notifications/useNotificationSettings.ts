import {useCallback,useEffect,useState} from 'react';
import {readNotificationSettings,setRemindersEnabled,type NotificationSettings} from './client';
export function useNotificationSettings(userId?:string){
  const [settings,setSettings]=useState<NotificationSettings|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const reload=useCallback(async()=>{
    if(!userId){setSettings(null);return;}
    try{setSettings(await readNotificationSettings(userId));setError('');}catch(e){setError(e instanceof Error?e.message:'알림 설정을 불러오지 못했어요.');}
  },[userId]);
  useEffect(()=>{void reload();const refresh=()=>void reload();window.addEventListener('kokjipseo:notification-preferences-changed',refresh);return()=>window.removeEventListener('kokjipseo:notification-preferences-changed',refresh);},[reload]);
  const toggle=async()=>{if(busy||!settings)return;setBusy(true);try{await setRemindersEnabled(!settings.enabled);await reload();}catch(e){setError(e instanceof Error?e.message:'설정을 저장하지 못했어요.');}finally{setBusy(false);}};
  return {settings,error,busy,reload,toggle};
}
