"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

// Shares the `?v=` TikTok attribution param between the hero and closing
// waitlist forms, so whichever one the visitor actually submits still
// carries the right `source` value. Mirrored into sessionStorage as a
// defensive fallback (e.g. if a future flow ever loses the param on a
// client-side transition).
const STORAGE_KEY = "roomredo_v";

const AttributionContext = createContext<string | null>(null);

function AttributionReader({
  onValue,
}: {
  onValue: (v: string | null) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const v = searchParams.get("v");
    if (v) {
      onValue(v);
      try {
        sessionStorage.setItem(STORAGE_KEY, v);
      } catch {
        // ignore — sessionStorage can be unavailable (private mode, etc.)
      }
      return;
    }
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) onValue(stored);
    } catch {
      // ignore
    }
  }, [searchParams, onValue]);

  return null;
}

export function AttributionProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<string | null>(null);
  const onValue = useCallback((v: string | null) => setSource(v), []);

  return (
    <AttributionContext.Provider value={source}>
      <Suspense fallback={null}>
        <AttributionReader onValue={onValue} />
      </Suspense>
      {children}
    </AttributionContext.Provider>
  );
}

export function useAttribution(): string | null {
  return useContext(AttributionContext);
}
