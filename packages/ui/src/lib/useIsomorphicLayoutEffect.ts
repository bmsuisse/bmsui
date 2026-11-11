import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server, so components
 * that measure the DOM before paint don't trigger React 18's
 * "useLayoutEffect does nothing on the server" warning during SSR.
 */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect =
  typeof window !== "undefined" && typeof window.document !== "undefined" ? useLayoutEffect : useEffect;
