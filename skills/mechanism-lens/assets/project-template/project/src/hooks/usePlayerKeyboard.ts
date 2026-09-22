import { useEffect } from "react";
import { handlePlayerKeydown, type PlayerAction } from "../lib/player-keyboard";

interface PlayerKeyboardActions {
  next: () => void;
  previous: () => void;
  home: () => void;
  toggleSubtitles: () => void;
  toggleEvidence: () => void;
}

export function usePlayerKeyboard({ next, previous, home, toggleSubtitles, toggleEvidence }: PlayerKeyboardActions) {
  useEffect(() => {
    const dispatch = (action: PlayerAction) => {
      if (action === "next") next();
      else if (action === "previous") previous();
      else if (action === "home") home();
      else if (action === "toggle-subtitles") toggleSubtitles();
      else toggleEvidence();
    };
    const onKeydown = (event: KeyboardEvent) => handlePlayerKeydown(event, dispatch);
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [home, next, previous, toggleEvidence, toggleSubtitles]);
}
