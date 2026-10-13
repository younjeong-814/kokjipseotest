import { asset } from '../lib/assets';
import type { Navigate } from '../prototype/flow';
import { PrototypeButton } from './PrototypeButton';
export function TopHeader({ title, search, navigate }: { title: string; search?: string; navigate: Navigate }) {
  return <header className="top-header"><h1>{title}</h1>{search && <PrototypeButton className="search-button" destination={search} navigate={navigate} aria-label="식재료 검색"><img src={asset('search.svg')} alt="" /></PrototypeButton>}</header>;
}
