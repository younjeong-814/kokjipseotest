import { createContext, useContext } from 'react';
import type { AppStorage } from './snapshot';
export const StorageContext = createContext<AppStorage | null>(null);
export function useAppStorage(): AppStorage {return useContext(StorageContext) ?? localStorage;}
