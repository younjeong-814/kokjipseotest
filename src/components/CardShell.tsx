import type { ReactNode } from 'react';
export function CardShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-shell ${className}`}>{children}</div>;
}
