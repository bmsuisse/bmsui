import { createContext, useContext } from "react";

interface SidebarContextValue {
  /** True when the nearest `<Sidebar>` is showing its icon-only rail (labels/group headers hidden). */
  collapsed: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false });

export const SidebarContextProvider = SidebarContext.Provider;

/**
 * Whether the nearest ancestor `<Sidebar>` is rail-collapsed. Defaults to
 * `false` when there is no ancestor `<Sidebar>` — this is what lets
 * `NavGroup`/`NavItem` be reused standalone inside a mobile drawer (`Sheet`),
 * which is never rail-collapsed.
 */
export function useSidebarCollapsed(): boolean {
  return useContext(SidebarContext).collapsed;
}
