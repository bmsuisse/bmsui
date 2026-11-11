import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CommandItem } from "./types";

interface RegistryActions {
  register: (key: symbol, commands: CommandItem[]) => void;
  unregister: (key: symbol) => void;
}

// Split so components that only register (`useRegisterCommands`) never re-render
// when the command list changes — otherwise registering an inline array would
// update the context the caller reads and loop.
const RegistryActionsContext = createContext<RegistryActions | null>(null);
const RegistryCommandsContext = createContext<CommandItem[] | null>(null);

/**
 * Holds the commands that mounted components registered with
 * `useRegisterCommands`, so a page can add its own commands ("Export offers",
 * "New contact") to the app-wide `CommandPalette` while it's on screen.
 * Mount it once around the app shell.
 */
export function CommandRegistryProvider({ children }: { children: ReactNode }): ReactElement {
  const sources = useRef<Map<symbol, CommandItem[]>>(new Map());
  const [commands, setCommands] = useState<CommandItem[]>(EMPTY);
  const actions = useMemo<RegistryActions>(() => {
    const publish = (): void => setCommands(Array.from(sources.current.values()).flat());
    return {
      register: (key, list) => {
        if (sources.current.get(key) === list) return;
        sources.current.set(key, list);
        publish();
      },
      unregister: (key) => {
        if (!sources.current.delete(key)) return;
        publish();
      },
    };
  }, []);
  return (
    <RegistryActionsContext.Provider value={actions}>
      <RegistryCommandsContext.Provider value={commands}>{children}</RegistryCommandsContext.Provider>
    </RegistryActionsContext.Provider>
  );
}

function sameList(a: readonly string[] | string | undefined, b: readonly string[] | string | undefined): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

function sameCommands(a: CommandItem[], b: CommandItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((x, i) => {
    const y = b[i] as CommandItem;
    return (
      x.id === y.id &&
      x.label === y.label &&
      x.group === y.group &&
      x.description === y.description &&
      x.icon === y.icon &&
      x.disabled === y.disabled &&
      sameList(x.shortcut, y.shortcut) &&
      sameList(x.keywords, y.keywords)
    );
  });
}

/**
 * Adds `commands` to the nearest `CommandRegistryProvider` while the calling
 * component is mounted. An inline array is fine: it only re-registers when a
 * command's id, label, group, description, icon, shortcut, keywords or
 * `disabled` changes, and `onSelect` always calls the latest handler.
 */
export function useRegisterCommands(commands: CommandItem[]): void {
  const actions = useContext(RegistryActionsContext);
  const [key] = useState(() => Symbol("commands"));
  const latest = useRef(commands);
  latest.current = commands;
  const cache = useRef<{ source: CommandItem[]; wrapped: CommandItem[] } | null>(null);
  if (!cache.current || !sameCommands(cache.current.source, commands)) {
    cache.current = {
      source: commands,
      wrapped: commands.map((command, index) => ({
        ...command,
        onSelect: () => {
          const current = latest.current[index];
          return (current?.id === command.id ? current : command).onSelect();
        },
      })),
    };
  }
  const wrapped = cache.current.wrapped;
  useEffect(() => {
    actions?.register(key, wrapped);
  }, [actions, key, wrapped]);
  useEffect(() => () => actions?.unregister(key), [actions, key]);
}

/** Every command currently registered with the nearest `CommandRegistryProvider` (empty without one). */
export function useRegisteredCommands(): CommandItem[] {
  return useContext(RegistryCommandsContext) ?? EMPTY;
}

const EMPTY: CommandItem[] = [];
