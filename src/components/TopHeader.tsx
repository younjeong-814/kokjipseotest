import { asset } from '../lib/assets';
import type { Navigate } from '../prototype/flow';
import { PrototypeButton } from './PrototypeButton';
export function TopHeader({ title, search, navigate, onSearch }: { title: string; search?: string; navigate: Navigate; onSearch?: () => void }) {
  return <header className="top-header"><h1>{title}</h1>{onSearch ? <button type="button" className="search-button" onClick={onSearch} aria-label="식재료 검색"><img src={asset('search.svg')} alt="" /></button> : search && <PrototypeButton className="search-button" destination={search} navigate={navigate} aria-label="식재료 검색"><img src={asset('search.svg')} alt="" /></PrototypeButton>}</header>;
}
