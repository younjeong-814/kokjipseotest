import { useRef, useState } from 'react';
import { TopHeader } from '../../components/TopHeader';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';

export function FridgeSearchPage({ navigate, onClose }: { navigate: Navigate; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
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
