import { asset } from '../lib/assets';

export function ConnectionStatusIcon({ error = false }: { error?: boolean }) {
  return <span className={`connection-status-icon ${error ? 'is-error' : 'is-success'}`} aria-hidden="true">
    <img src={asset(error ? 'status-error-mark.svg' : 'status-success-mark.svg')} alt="" />
  </span>;
}
