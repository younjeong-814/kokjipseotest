import { useEffect } from 'react';

export function RegistrationToast({ onDismiss, message = '식재료 8개를 등록했어요' }: { onDismiss: () => void; message?: string }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(timeout);
  }, [onDismiss]);

  return <div className="registration-toast" role="status" aria-live="polite" aria-atomic="true" data-figma-node="5693:5029">{message}</div>;
}
