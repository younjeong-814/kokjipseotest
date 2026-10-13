import { CardShell } from '../../components/CardShell';
import { asset } from '../../lib/assets';
const storageTypes = ['냉장', '냉동', '실온'];
export function FridgeSummary() {
  return <section className="fridge-summary"><h2>내 냉장고 요약</h2><CardShell><div className="summary-grid">{storageTypes.map((type,index) => <div className="summary-item" key={type}><span className={`storage-icon storage-icon-${index}`}><img src={asset('storage.png')} alt="" /></span><span className="storage-label">{type}</span><b>0개</b></div>)}</div></CardShell></section>;
}
