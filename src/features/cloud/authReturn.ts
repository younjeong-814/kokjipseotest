// OAuth 리다이렉트 주소는 허용 목록과 맞추기 위해 사이트 루트로 고정이라 #화면이 사라진다.
// 로그인을 시작한 화면을 기억해 두었다가 돌아오면(?code= / error) 그 화면으로 복원한다.
export const AUTH_RETURN_KEY = 'kokjipseo.auth-return';
const ERROR_PARAMS = ['error', 'error_code', 'error_description'];
type Place = Pick<Location, 'pathname' | 'search' | 'hash'>;

export function rememberAuthReturn(location: Place = window.location, store: Pick<Storage, 'setItem'> = sessionStorage) {
  try { store.setItem(AUTH_RETURN_KEY, location.hash && location.hash !== '#' ? location.hash : '#settings'); } catch { /* 복원 없이 진행한다. */ }
}

/** 이미 다른 계정에 연결된 Google 계정이라 연결이 거절됐으면 true — 그 계정으로 로그인해야 한다. */
export function restoreAuthReturn(
  location: Place = window.location,
  store: Pick<Storage, 'getItem' | 'removeItem'> = sessionStorage,
  replace: (url: string) => void = url => history.replaceState(history.state, '', url),
): boolean {
  try {
    const saved = store.getItem(AUTH_RETURN_KEY);
    if (!saved) return false;
    const search = new URLSearchParams(location.search);
    // 오류는 쿼리나 해시(#error=...)로 돌아온다.
    const hashParams = new URLSearchParams(location.hash.slice(1));
    const errorInHash = hashParams.has('error') || hashParams.has('error_code');
    const errors = errorInHash ? hashParams : search;
    const failed = errors.has('error') || errors.has('error_code');
    if (!failed && !search.has('code')) return false;
    store.removeItem(AUTH_RETURN_KEY);
    ERROR_PARAMS.forEach(key => search.delete(key));
    const query = search.toString();
    const hash = errorInHash || !location.hash || location.hash === '#' ? saved : location.hash;
    replace(`${location.pathname}${query ? `?${query}` : ''}${hash}`);
    return errors.get('error_code') === 'identity_already_exists';
  } catch { return false; /* 저장소를 쓸 수 없으면 기본 화면으로 둔다. */ }
}
