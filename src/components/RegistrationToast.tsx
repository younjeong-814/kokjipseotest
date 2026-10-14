import { useEffect } from 'react';

export function RegistrationToast({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(timeout);
  }, [onDismiss]);

  return <div className="registration-toast" role="status" aria-live="polite" aria-atomic="true" data-figma-node="5693:5029">식재료 8개를 등록했어요</div>;
}
