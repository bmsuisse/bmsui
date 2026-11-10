import type { ReactElement, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CommandItem } from "./types";

interface Registry {
  commands: CommandItem[];
  register: (key: symbol, commands: CommandItem[]) => void;
  unregister: (key: symbol) => void;
}

const RegistryContext = createContext<Registry | null>(null);

/**
 * Holds the commands that mounted components registered with
 * `useRegisterCommands`, so a page can add its own commands ("Export offers",
 * "New contact") to the app-wide `CommandPalette` while it's on screen.
 * Mount it once around the app shell.
 */
export function CommandRegistryProvider({ children }: { children: ReactNode }): ReactElement {
  const [sources, setSources] = useState<Map<symbol, CommandItem[]>>(() => new Map());
  const register = useCallback((key: symbol, commands: CommandItem[]) => {
    setSources((prev) => new Map(prev).set(key, commands));
  }, []);
  const unregister = useCallback((key: symbol) => {
    setSources((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);
  const commands = useMemo(() => Array.from(sources.values()).flat(), [sources]);
  const value = useMemo(() => ({ commands, register, unregister }), [commands, register, unregister]);
  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

/**
 * Adds `commands` to the nearest `CommandRegistryProvider` while the calling
 * component is mounted. Pass a memoized array (or one built from stable
 * values); it re-registers whenever the array identity changes.
 */
export function useRegisterCommands(commands: CommandItem[]): void {
  const registry = useContext(RegistryContext);
  const key = useRef(Symbol("commands")).current;
  const register = registry?.register;
  const unregister = registry?.unregister;
  useEffect(() => {
    register?.(key, commands);
  }, [register, key, commands]);
  useEffect(() => () => unregister?.(key), [unregister, key]);
}

/** Every command currently registered with the nearest `CommandRegistryProvider` (empty without one). */
export function useRegisteredCommands(): CommandItem[] {
  return useContext(RegistryContext)?.commands ?? EMPTY;
}

const EMPTY: CommandItem[] = [];
