export type ReminderEmailIngredient = {name:string;expiryDate:string};
export type ReminderEmail = {
  to:string;
  ingredients:ReminderEmailIngredient[];
  /** 소비 권장일까지 남은 일수. 0이면 당일 알림. */
  daysLeft?:number;
  fridgeUrl?:string;
  preferencesUrl?:string;
};

export const EMAIL_APP_BASE_URL='https://younjeong-814.github.io/kokjipseotest/';
export const EMAIL_APP_LINKS={
  fridge:`${EMAIL_APP_BASE_URL}#fridge?source=email`,
  preferences:`${EMAIL_APP_BASE_URL}#settings`,
} as const;
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

/** Inline, table-based markup for broad email-client support. */
export function renderReminderEmail(mail:ReminderEmail){
  const fridgeUrl=mail.fridgeUrl??EMAIL_APP_LINKS.fridge;
  const preferencesUrl=mail.preferencesUrl??EMAIL_APP_LINKS.preferences;
  const rows=mail.ingredients.map(item=>`<tr><td style="padding:0 0 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eaf5fe;border:1px solid #d4ebfe;border-radius:20px"><tr><td align="center" style="padding:24px 16px"><div style="font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:24px;line-height:32px;font-weight:700;color:#2a9df8">${escapeHtml(item.name)}</div><div style="padding-top:4px;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:16px;line-height:24px;color:#555d6d">${escapeHtml(item.expiryDate)}까지</div></td></tr></table></td></tr>`).join('');
  const daysLeft=mail.daysLeft??3;
  const headline=daysLeft>0?`소비기한이 ${daysLeft}일 남은 식재료가 있어요`:'소비기한이 오늘까지인 식재료가 있어요';
  const subject=`[콕집서] ⏰ ${headline}`;
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:#f1f3f4"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f3f4"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:700px;background:#fff"><tr><td style="padding:34px 32px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:24px;line-height:32px;font-weight:700;color:#2a9df8">콕집서</td><td align="right" style="font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:16px;line-height:24px;color:#868b94">소비 권장일 알림</td></tr></table><div style="height:1px;margin-top:24px;background:#d4ebfe"></div></td></tr><tr><td style="padding:20px 32px 30px"><h1 style="margin:0;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:32px;line-height:42px;font-weight:700;color:#2a3038">${headline}.</h1><p style="margin:8px 0 24px;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:20px;line-height:28px;color:#868b94">아까운 식재료가 버려지기 전에, 지금 확인해보세요.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto 0"><tr><td align="center" bgcolor="#2a9df8" style="border-radius:20px"><a href="${escapeHtml(fridgeUrl)}" style="display:inline-block;padding:20px 36px;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:24px;line-height:32px;font-weight:700;color:#fff;text-decoration:none">냉장고 확인하기</a></td></tr></table><div style="height:1px;margin-top:30px;background:#d4ebfe"></div><p style="margin:20px 0 0;text-align:center;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:16px;line-height:24px;color:#868b94">콕집서 사용자 알림입니다. | <a href="${escapeHtml(preferencesUrl)}" style="color:#555d6d;text-decoration:underline">알림 설정</a></p></td></tr></table></td></tr></table></body></html>`;
  const text=[subject,'',`${headline}.`,'아까운 식재료가 버려지기 전에, 지금 확인해보세요.','',...mail.ingredients.map(item=>`${item.name} · ${item.expiryDate}까지`),'',`냉장고 확인하기: ${fridgeUrl}`,`알림 설정: ${preferencesUrl}`].join('\n');
  return {to:mail.to,subject,html,text};
}
