import { asset } from '../lib/assets';
export function StatusBar() {
  return <div className="status-bar" aria-hidden="true"><b>9:41</b><div className="status-icons"><span className="signal">{[4,6,8,10].map(height => <i key={height} style={{height}} />)}</span><img src={asset('wifi.svg')} alt=""/><span className="battery"><i/></span></div></div>;
}
