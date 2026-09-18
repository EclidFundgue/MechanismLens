import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "presentation-subtitles";

/**
 * Resolve the initial subtitle visibility:
 *   URL `?subs=0` / `?subs=1`  >  localStorage  >  default ON.
 */
function readInitial(): boolean {
  if (typeof window === "undefined") return true;
  const q = new URLSearchParams(window.location.search);
  if (q.get("subs") === "0") return false;
  if (q.get("subs") === "1") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * Subtitle visibility state. Persists to localStorage, toggled with the
 * `S` key or the corner control. Complements the existing keybindings
 * (Space/arrows = step, M = playback mode) — `S` is unclaimed.
 */
export function useSubtitle() {
  const [visible, setVisible] = useState<boolean>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, visible ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [visible]);

  const toggle = useCallback(() => setVisible((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { visible, toggle };
}
