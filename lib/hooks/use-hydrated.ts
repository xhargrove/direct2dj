"use client";

import { useSyncExternalStore } from "react";

/** True after client hydration — use to avoid SSR/client text mismatches (React #418). */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
