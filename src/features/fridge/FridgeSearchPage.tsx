import { useEffect, useRef, useState } from 'react';
import { TopHeader } from '../../components/TopHeader';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';

// 입력이 멈추고 이만큼 지나면 검색한다. 한글 조합 중이어도 search.ts 규칙대로 처리한다.
const SEARCH_DELAY_MS = 250;

export function FridgeSearchPage({ navigate, onClose, onSearch }: { navigate: Navigate; onClose: () => void; onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const search = useRef(onSearch);
  search.current = onSearch;
  useEffect(() => {
    const timer = window.setTimeout(() => search.current(query), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);
  const finish = () => {
    if (query.trim()) input.current?.blur();
    else input.current?.focus();
  };
  return <>
    <TopHeader title="냉장고" navigate={navigate} onSearch={onClose} />
    <div className="fridge-search-page" data-figma-node={focused ? '5760:6523' : query ? '5760:6633' : '5760:6413'}>
      <form role="search" className="fridge-search-form" onSubmit={event => { event.preventDefault(); finish(); }}>
        <div className={`fridge-search-input${query ? ' filled' : ''}${focused ? ' focused' : ''}`}>
          <input ref={input} type="text" aria-label="식재료 검색어" placeholder="예: 돼지고기, 시금치, 계란..." autoComplete="off" enterKeyHint="search" value={query} onChange={event => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={event => { if (event.key === 'Escape') onClose(); }} />
          {focused && query && <button type="button" className="fridge-search-clear" aria-label="검색어 지우기" onPointerDown={event => event.preventDefault()} onClick={() => { setQuery(''); input.current?.focus(); }}><img src={asset('search-clear.svg')} alt="" /></button>}
        </div>
      </form>
    </div>
  </>;
}

export function FridgeSearchEmpty({ query, onRegister }: { query: string; onRegister: () => void }) {
  return <main className="fridge-search-empty" role="status">
    <p className="fridge-search-empty-title">'{query}'에 해당하는 식재료가 없어요</p>
    <p className="fridge-search-empty-hint">다른 이름으로 검색하거나 새로 등록해 보세요</p>
    <button type="button" onClick={onRegister}>식재료 등록하기</button>
  </main>;
}
