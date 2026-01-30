import { createContext, useContext } from 'react';

interface SidebarContextValue {
  openMobileSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  openMobileSidebar: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}
