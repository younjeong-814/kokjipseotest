import { useState } from 'react';
import { OverlayDialog } from '../../components/OverlayDialog';
import { ActionButton } from '../../components/ActionButton';
import { FridgeTabs } from '../fridge/FridgeTabs';
import { FridgeFilters, type FridgeSort } from '../fridge/FridgeFilters';
import { asset } from '../../lib/assets';
import type { Navigate } from '../../prototype/flow';
import type { Ingredient } from './repository';

const images: Record<string, string> = { '육류': 'food-meat.png', '과일': 'food-fruit.png', '채소': 'ai-vegetable.png', '두부·콩류': 'ai-bean.png', '수산물': 'food-fish.png', '조미료': 'food-sauce.png' };

export function StoredIngredientsPage({ navigate, items, onEdit, onDelete, registered = false }: { navigate: Navigate; items: Ingredient[]; onEdit: (item: Ingredient) => void; onDelete: (id: string) => void; registered?: boolean }) {
  const [sort, setSort] = useState<FridgeSort>(registered ? '등록순' : '소비기한');
  const [deleting, setDeleting] = useState<Ingredient | null>(null);
  const [error, setError] = useState('');
  const sorted = [...items].sort((a, b) => sort === '등록순' ? b.createdAt.localeCompare(a.createdAt) : sort === '남은양순' ? 0 : (a.date || '9999').localeCompare(b.date || '9999'));
  return <main className="fridge-page">
    <FridgeTabs navigate={navigate} /><FridgeFilters value={sort} onChange={setSort} />
    <section className="registered-fridge-list stored-ingredients" aria-label={`${sort} 식재료 목록`}>{sorted.map(item => <article className="registered-food-card stored-ingredient" key={item.id}>
      <div className="registered-food-image"><img src={asset(images[item.category] ?? 'food-processed.png')} alt="" /><span>{item.category}</span></div>
      <div className="registered-food-info"><h2>{item.name}</h2><div className="food-badges"><span>{item.storage}</span></div><p>수량 {item.quantity} {item.unit}</p><p>소비 권장일 {item.date || '미지정'}</p><div className="ingredient-actions"><button type="button" aria-label={`${item.name} 수정`} onClick={() => onEdit(item)}>수정</button><button type="button" aria-label={`${item.name} 삭제`} onClick={() => { setDeleting(item); setError(''); }}>삭제</button></div></div>
    </article>)}</section>
    {deleting && <OverlayDialog label="식재료 삭제 확인" onClose={() => setDeleting(null)}><div className="ingredient-delete-dialog"><h2>식재료를 삭제할까요?</h2><p>{deleting.name}</p>{error && <p role="alert">{error}</p>}<div className="ingredient-actions"><button type="button" onClick={() => setDeleting(null)}>취소</button><ActionButton onClick={() => { try { onDelete(deleting.id); setDeleting(null); } catch (failure) { setError(failure instanceof Error ? failure.message : '삭제하지 못했어요.'); } }}>삭제하기</ActionButton></div></div></OverlayDialog>}
  </main>;
}
