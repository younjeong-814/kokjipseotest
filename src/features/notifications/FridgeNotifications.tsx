import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, authRedirectUrl } from '../cloud/client';
import { readNotificationSettings, setRemindersEnabled, type NotificationSettings } from './client';
import { chooseFridgeNotice, registrationNoticeMessage, isFridgeReentry, isFridgeScreen, maskNoticeEmail, noticeDay, type NoticeKind } from './fridgeNoticePolicy';
import { OverlayDialog } from '../../components/OverlayDialog';
import { ActionButton } from '../../components/ActionButton';
import { RegistrationToast } from '../../components/RegistrationToast';
import { EmailReminderModal } from '../mypage/EmailReminderModal';
import { asset } from '../../lib/assets';
import type { Ingredient } from '../ingredients/repository';
import type { ScreenId } from '../../prototype/flow';

function readStamp(storage: 'localStorage' | 'sessionStorage', key: string) { try { return window[storage].getItem(key); } catch { return null; } }
function writeStamp(storage: 'localStorage' | 'sessionStorage', key: string, value: string) { try { window[storage].setItem(key, value); } catch { /* In-memory limits still apply. */ } }

export function FridgeNotifications({ screen, items, registrationActive, registrationMessage, onDismissRegistration }: {
  screen: ScreenId; items: Ingredient[]; registrationActive: boolean; registrationMessage: string;
  onDismissRegistration: () => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [ready, setReady] = useState(false);
  const [popup, setPopup] = useState<NoticeKind | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enabledToast, setEnabledToast] = useState(false);
  const previous = useRef<string>(screen);
  const pending = useRef(false);
  const memory = useRef(new Set<string>());
  const working = useRef(false);
  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let active = true;
    const update = (next: Session | null) => { if (active) { setReady(false); setSettings(null); setSession(next); } };
    void supabase.auth.getSession().then(({ data }) => update(data.session)).catch(() => { if (active) setReady(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => update(next));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    let active = true;
    const reload = async () => {
      if (!session) { setReady(!supabase); return; }
      setReady(false);
      try { const result = await readNotificationSettings(session.user.id); if (active) { setSettings(result); setReady(true); } }
      catch { if (active) setReady(false); }
    };
    void reload();
    window.addEventListener('kokjipseo:notification-preferences-changed', reload);
    return () => { active = false; window.removeEventListener('kokjipseo:notification-preferences-changed', reload); };
  }, [session]);
  const verified = Boolean(settings?.email && settings.email_verified_at);
  const google = Boolean(session?.user.identities?.some(identity => identity.provider === 'google'));
  const masked = maskNoticeEmail(settings?.email ?? '');
  const owner = session?.user.id ?? 'local';
  useEffect(() => {
    if (previous.current !== screen) {
      pending.current = isFridgeReentry(previous.current, screen);
      previous.current = screen;
      setPopup(null); setEmailOpen(false); setError(''); setEnabledToast(false);
    }
    if (!pending.current || !ready || !items.length || registrationActive || emailOpen) return;
    const kindKey = `kokjipseo:fridge-notice:${owner}:${verified ? 'google' : 'email'}`;
    const dayKey = `kokjipseo:fridge-notice:${owner}:enable`;
    const today = noticeDay();
    const kind = chooseFridgeNotice({ anonymous: !session || Boolean(session.user.is_anonymous), verified, enabled: Boolean(settings?.enabled), google, count: items.length,
      sessionSeen: memory.current.has(kindKey) || readStamp('sessionStorage', kindKey) === '1',
      daySeen: memory.current.has(`${dayKey}:${today}`) || readStamp('localStorage', dayKey) === today });
    pending.current = false;
    if (!kind) return;
    if (kind === 'enable') { writeStamp('localStorage', dayKey, today); memory.current.add(`${dayKey}:${today}`); }
    else { writeStamp('sessionStorage', kindKey, '1'); memory.current.add(kindKey); }
    setPopup(kind);
  }, [screen, ready, items.length, registrationActive, emailOpen, verified, google, settings?.enabled, owner, session]);
  const close = () => { if (!working.current) { setPopup(null); setError(''); } };
  const enable = async () => {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try { await setRemindersEnabled(true); setSettings(value => value ? { ...value, enabled: true } : value); setPopup(null); setEnabledToast(true); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '알림을 켜지 못했어요.'); }
    finally { working.current = false; setBusy(false); }
  };
  const connectGoogle = async () => {
    if (!supabase || working.current) return;
    working.current = true; setBusy(true); setError('');
    try {
      const options = { redirectTo: authRedirectUrl(), scopes: 'openid email profile' };
      const result = session?.user.is_anonymous ? await supabase.auth.linkIdentity({ provider: 'google', options }) : await supabase.auth.signInWithOAuth({ provider: 'google', options });
      if (result.error) throw result.error;
    } catch { setError('Google 계정을 연결하지 못했어요. 현재 기록은 유지되며 설정에서 다시 시도할 수 있어요.'); }
    finally { working.current = false; setBusy(false); }
  };
  const active = isFridgeScreen(screen);
  const registrationNotice = registrationNoticeMessage(ready && verified, Boolean(settings?.enabled));
  return <>
    {active && registrationActive && !popup && !emailOpen && (registrationNotice
      ? <NoticeToast message={registrationNotice} onDismiss={onDismissRegistration} />
      : <RegistrationToast message={registrationMessage || '식재료를 등록했어요'} onDismiss={onDismissRegistration} />)}
    {active && enabledToast && !popup && <NoticeToast message="소비기한이 다가오면 알려드릴게요" onDismiss={() => setEnabledToast(false)} />}
    {active && popup && <FridgeNoticeDialog popup={popup} items={items} masked={masked} close={close} busy={busy} error={error} enable={enable} connectGoogle={connectGoogle} onEmail={() => { setPopup(null); setEmailOpen(true); }} />}
    {active && emailOpen && <EmailReminderModal onClose={() => setEmailOpen(false)} />}
  </>;
}

export function NoticeToast({ message, onDismiss, onSettings }: { message: string; onDismiss: () => void; onSettings?: () => void }) {
  const dismiss = useRef(onDismiss); dismiss.current = onDismiss;
  useEffect(() => { const timer = window.setTimeout(() => dismiss.current(), 3500); return () => window.clearTimeout(timer); }, [message]);
  return <div className="registration-toast fridge-notice-toast" data-figma-node="6437:7576" role="status" aria-live="polite"><span className="fridge-notice-success"><img src={asset('fridge-notice-success.svg')} alt="" /></span><span>{message}</span>{onSettings && <button type="button" onClick={onSettings}>설정</button>}</div>;
}

export function FridgeNoticeDialog({ popup, items, masked, close, busy, error, enable, connectGoogle, onEmail }: {
 popup: NoticeKind; items: Pick<Ingredient, "name">[]; masked: string; close: () => void; busy: boolean; error: string;
 enable: () => Promise<void>; connectGoogle: () => Promise<void>; onEmail: () => void;
}) {
  return <OverlayDialog label="소비 권장일 알림 안내" onClose={close} className="fridge-notice-dialog">
      <div className="fridge-notice-card" data-figma-node={popup === 'email' ? '6437:7464' : popup === 'google' ? '6437:7502' : '6437:7532'}>
        <header><h2>{popup === 'email' ? <>소비기한 지나기 전에<br />먼저 알려드릴게요</> : popup === 'google' ? <>지금 기록은<br />이 기기에서만 볼 수 있어요</> : <>알림을 켜고 {items.length === 1 ? items[0].name : '재료의'}<br />소비기한을 놓치지 마세요</>}</h2><button type="button" aria-label="닫기" disabled={busy} onClick={close}><img src={asset('fridge-notice-close.svg')} alt="" /></button></header>
        <p className="fridge-notice-description">{popup === 'email' ? <>냉장고 속 재료의 소비 권장일이 다가오면<br />이메일로 먼저 챙겨드려요</> : popup === 'google' ? <>Google 계정을 연결하면<br />다른 기기에서도 내 냉장고를 이어서 쓸 수 있어요</> : <>다시 켜면 소비 권장일이 다가올 때<br />{masked}으로 알려드려요</>}</p>
        <div className={`fridge-notice-preview ${popup}`}>
          {popup === 'email' ? <div className="fridge-notice-mail"><img src={asset('fridge-notice-bell.svg')} alt="" /><div><small>콕집 · 소비 권장일 알림</small><strong>소비기한이 3일 남은 재료가 있어요</strong></div></div>
            : popup === 'google' ? <><img src={asset('fridge-notice-bell.svg')} alt="" /><p>알림은 지금처럼<br />{masked}으로 받아요</p></>
            : <><div><strong>소비 권장일 알림</strong><small>{masked}</small></div><button type="button" role="switch" aria-checked="false" aria-label="소비 권장일 알림 켜기" disabled={busy} onClick={() => void enable()}><img src={asset('fridge-notice-switch.svg')} alt="" /></button></>}
        </div>
        {popup === 'email' && <p className="fridge-notice-helper">같은 날 홈 화면에서도 먼저 보여드려요<br />로그인 없이 이메일만 입력하면 돼요</p>}
        {error && <p role="alert" className="fridge-notice-error">{error}</p>}
        <ActionButton className="action-button-large" disabled={busy} onClick={() => {
          if (popup === 'email') { onEmail(); }
          else if (popup === 'google') void connectGoogle();
          else void enable();
        }}>{busy ? '처리 중이에요' : popup === 'email' ? '알림 설정하기' : popup === 'google' ? 'Google 계정 연결하기' : '알림 다시 켜기'}</ActionButton>
      </div>
      <button className="fridge-notice-later" type="button" disabled={busy} onClick={close}>{popup === 'enable' ? '괜찮아요' : '다음에 할게요'}</button>
    </OverlayDialog>;
}
