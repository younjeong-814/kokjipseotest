import { useEffect, useRef } from 'react';
import { asset } from '../lib/assets';

export function Snackbar({ message, onDismiss, className = '', variant = 'default', figmaNode }: { message: string; onDismiss: () => void; className?: string; variant?: 'default' | 'success'; figmaNode?: string }) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const timeout = window.setTimeout(() => dismiss.current(), 3500);
    return () => window.clearTimeout(timeout);
  }, [message]);
  return <div className={`registration-toast snackbar-${variant} ${className}`} role="status" aria-live="polite" aria-atomic="true" data-figma-node={figmaNode ?? (variant === 'success' ? '3142:2979' : '3142:2968')}>{variant === 'success' && <span className="snackbar-success-icon" aria-hidden="true"><img src={asset('snackbar-success.svg')} alt="" /></span>}<span>{message}</span></div>;
}
