import { useEffect, useRef, useState } from "react";
import type { Bounds, SceneStep } from "../types";
import { boundsNearlyEqual, boundsToViewBox, easeInOutCubic, interpolateBounds } from "../stage/model";

export type CameraPhase = "locating" | "settled";

export function useCameraViewBox(target: Bounds, overview: Bounds, transition: SceneStep["transition"], stepId: string, onPhaseChange?: (stepId: string, phase: CameraPhase) => void) {
  const [current, setCurrent] = useState(target);
  const currentRef = useRef(target);
  useEffect(() => {
    const reduceMotion = (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false) || new URLSearchParams(window.location.search).get("motion") === "reduce";
    const start = currentRef.current, duration = reduceMotion ? 0 : Math.max(0, transition.durationMs);
    if (duration === 0 || boundsNearlyEqual(start, target)) {
      currentRef.current = target;
      setCurrent(target);
      onPhaseChange?.(stepId, "settled");
      return;
    }
    onPhaseChange?.(stepId, "locating");
    let frame = 0, startedAt = 0;
    const tick = (time: number) => {
      if (startedAt === 0) startedAt = time;
      const raw = Math.min(1, (time - startedAt) / duration);
      const eased = transition.easing === "linear" ? raw : easeInOutCubic(raw);
      const next = transition.strategy === "viaOverview"
        ? eased < .5 ? interpolateBounds(start, overview, easeInOutCubic(eased * 2)) : interpolateBounds(overview, target, easeInOutCubic((eased - .5) * 2))
        : interpolateBounds(start, target, eased);
      currentRef.current = next; setCurrent(next);
      if (raw < 1) frame = window.requestAnimationFrame(tick);
      else onPhaseChange?.(stepId, "settled");
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [onPhaseChange, overview, stepId, target, transition.durationMs, transition.easing, transition.strategy]);
  return boundsToViewBox(current);
}
