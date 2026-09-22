export type PlayerAction =
  | "next"
  | "previous"
  | "home"
  | "toggle-subtitles"
  | "toggle-evidence";

type KeyboardEventLike = Pick<KeyboardEvent,
  "altKey" | "ctrlKey" | "defaultPrevented" | "isComposing" | "key" | "metaKey" | "repeat" | "shiftKey" | "target"
>;

function targetMatches(target: EventTarget | null, selector: string): boolean {
  if (!target || typeof target !== "object") return false;
  const candidate = target as EventTarget & {
    isContentEditable?: boolean;
    closest?: (selector: string) => Element | null;
  };
  return Boolean(candidate.isContentEditable)
    || (typeof candidate.closest === "function" && Boolean(candidate.closest(selector)));
}

export function getPlayerAction(event: KeyboardEventLike): PlayerAction | null {
  if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return null;
  if (targetMatches(event.target, 'input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return null;
  if (event.key === "ArrowRight") return "next";
  if (event.key === "ArrowLeft") return "previous";
  if (targetMatches(event.target, "button, a")) return null;
  if (event.key === " ") return "next";
  if (event.key === "Home") return "home";
  if (event.key.toLowerCase() === "s") return "toggle-subtitles";
  if (event.key.toLowerCase() === "e") return "toggle-evidence";
  return null;
}

export function handlePlayerKeydown(event: KeyboardEvent, dispatch: (action: PlayerAction) => void): boolean {
  const action = getPlayerAction(event);
  if (!action) return false;
  event.preventDefault();
  dispatch(action);
  return true;
}
