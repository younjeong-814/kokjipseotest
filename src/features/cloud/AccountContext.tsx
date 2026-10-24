import {createContext,useContext,type ReactNode} from 'react';
export const AccountContext=createContext<ReactNode>(null);
export function CloudAccountSlot(){return useContext(AccountContext);}
