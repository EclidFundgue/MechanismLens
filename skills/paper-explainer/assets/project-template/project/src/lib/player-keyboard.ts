export type PlayerAction =
  | "next"
  | "previous"
  | "home"
  | "toggle-subtitles"
  | "toggle-evidence";

type KeyboardEventLike = Pick<KeyboardEvent,
  "altKey" | "ctrlKey" | "defaultPrevented" | "isComposing" | "key" | "metaKey" | "repeat" | "shiftKey" | "target"
>;

function hasInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const candidate = target as EventTarget & {
    isContentEditable?: boolean;
    closest?: (selector: string) => Element | null;
  };
  if (candidate.isContentEditable) return true;
  return typeof candidate.closest === "function" && Boolean(candidate.closest(
    'input, textarea, select, button, a, [contenteditable=""], [contenteditable="true"]',
  ));
}

export function getPlayerAction(event: KeyboardEventLike): PlayerAction | null {
  if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return null;
  if (hasInteractiveTarget(event.target)) return null;
  if (event.key === "ArrowRight" || event.key === " ") return "next";
  if (event.key === "ArrowLeft") return "previous";
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
