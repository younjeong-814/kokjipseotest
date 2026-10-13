import type { ButtonHTMLAttributes } from 'react';
import { isScreenId, type Navigate } from '../prototype/flow';
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { destination: string; navigate: Navigate };

/** Only verified destinations in the agreed screen scope can navigate. */
export function PrototypeButton({ destination, navigate, ...props }: Props) {
  return <button {...props} data-figma-destination={destination} disabled={!isScreenId(destination)} onClick={() => { if (isScreenId(destination)) navigate(destination); }} />;
}
