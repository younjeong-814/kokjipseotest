export type NoticeKind = 'email' | 'google' | 'enable';
export type NoticeState = { anonymous: boolean; verified: boolean; enabled: boolean; google: boolean; count: number; sessionSeen: boolean; daySeen: boolean };
export function chooseFridgeNotice(state: NoticeState): NoticeKind | null {
  if (state.count < 1) return null;
  if (!state.verified) return state.anonymous && !state.google && !state.sessionSeen ? 'email' : null;
  if (!state.enabled) return state.daySeen ? null : 'enable';
  if (!state.google && state.count >= 2 && !state.sessionSeen) return 'google';
  return null;
}
export function registrationNoticeMessage(verified: boolean, enabled: boolean) {
  return verified && enabled ? '소비기한이 다가오면 알려드릴게요' : null;
}
export function maskNoticeEmail(email: string) {
  const [name, domain] = email.split('@');
  return name && domain ? `${name.slice(0, Math.min(2, Math.max(1, name.length - 1)))}***@${domain}` : '';
}
export function noticeDay(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
export function isFridgeScreen(screen: string) {
  return ['fridge', 'fridge-food', 'fridge-registered'].includes(screen);
}
export function isFridgeReentry(previous: string, next: string) {
  return isFridgeScreen(next) && !isFridgeScreen(previous) && !['manual-entry', 'recognition-result'].includes(previous);
}
