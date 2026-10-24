type Gateway = { url: string; key: string; token: () => Promise<string | null> };
let gateway: Gateway | null = null;
export function configureExternalRequests(value: Gateway | null) { gateway = value; }
/** External credentials never enter this module. Only the publishable key and user JWT. */
export async function requestExternal(kind: 'recipes' | 'ocr' | 'recognize', localUrl: string, init?: RequestInit): Promise<Response> {
  if (!gateway) return fetch(localUrl, init);
  const token = await gateway.token();
  if (!token) throw new Error('이 기능은 Google 로그인 후 사용할 수 있어요. 마이페이지에서 로그인해 주세요.');
  const query = localUrl.includes('?') ? localUrl.slice(localUrl.indexOf('?')) : '';
  const headers = new Headers(init?.headers);
  headers.set('apikey',gateway.key);
  headers.set('Authorization',`Bearer ${token}`);
  return fetch(`${gateway.url}/functions/v1/${kind}${query}`,{...init,headers});
}
