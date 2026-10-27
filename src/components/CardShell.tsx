import type { HTMLAttributes, ReactNode } from 'react';
export function CardShell({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; className?: string }) {
  return <div className={`card-shell ${className}`} {...props}>{children}</div>;
}
