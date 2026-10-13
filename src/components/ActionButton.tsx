import type { ButtonHTMLAttributes } from 'react';
export function ActionButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`action-button ${className}`} {...props} />;
}
