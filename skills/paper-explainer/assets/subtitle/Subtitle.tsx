import "./Subtitle.css";

interface Props {
  /** Narration text for the current (chapter, step). Empty -> nothing renders. */
  text: string;
  /** Master on/off (see useSubtitle). */
  visible: boolean;
}

/**
 * Bottom subtitle bar, rendered INSIDE the 16:9 stage-frame so it scales
 * with the stage and is captured by screen recording.
 *
 * The text is the current step's narration — `narrations.ts` stays the single
 * source of truth, so subtitles can never drift from the spoken script.
 *
 * `pointer-events: none` (see Subtitle.css) so the bar never swallows a click
 * that should advance the stage.
 */
export function Subtitle({ text, visible }: Props) {
  if (!visible || !text.trim()) return null;
  return (
    <div className="subtitle-layer">
      <p className="subtitle-text">{text}</p>
    </div>
  );
}
