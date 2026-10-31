import {useEffect} from 'react';
import {supabase} from '../cloud/client';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const appKeys=new Map<string,string>();
const clickKeys=new Map<string,string>();
export async function recordUTEvent(type:'app_open'|'notification_click'|'ingredient_view'|'ingredient_manage',key:string=crypto.randomUUID(),ingredientId?:string,deliveryId?:string){
  if(!supabase)return;
  // Database checks active UT consent, owner, delivery status and idempotency.
  await supabase.rpc('record_ut_event',{p_event_key:key,p_event_type:type,p_ingredient_id:ingredientId??null,p_delivery_id:deliveryId??null});
}
export async function recordManagedActivity(userId:string,activity:{id:string;itemId:string}){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${userId}:${activity.id}`));
  const hex=[...new Uint8Array(digest)].slice(0,16).map(v=>v.toString(16).padStart(2,'0')).join('');
  const key=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  await recordUTEvent('ingredient_manage',key,activity.itemId);
}
/** Optional UT tracking cannot block or modify fridge CRUD. No collection before DB consent. */
export function UTTracker({userId}:{userId:string}){
  useEffect(()=>{
    if(!appKeys.has(userId))appKeys.set(userId,crypto.randomUUID());
    const report=()=>{
      const query=new URLSearchParams(window.location.hash.split('?')[1]??'');
      const item=query.get('item'),delivery=query.get('delivery')??new URLSearchParams(window.location.search).get('delivery');
      void recordUTEvent('app_open',appKeys.get(userId)).catch(()=>{});
      if(window.location.hash.startsWith('#ingredient-detail')&&item&&uuid.test(item))void recordUTEvent('ingredient_view',crypto.randomUUID(),item).catch(()=>{});
      if(delivery&&uuid.test(delivery)){
        const mapKey=userId+':'+delivery;
        if(!clickKeys.has(mapKey))clickKeys.set(mapKey,crypto.randomUUID());
        void recordUTEvent('notification_click',clickKeys.get(mapKey),undefined,delivery).catch(()=>{});
      }
    };
    report();window.addEventListener('hashchange',report);window.addEventListener('kokjipseo:notification-preferences-changed',report);
    return()=>{window.removeEventListener('hashchange',report);window.removeEventListener('kokjipseo:notification-preferences-changed',report);};
  },[userId]);
  return null;
}
