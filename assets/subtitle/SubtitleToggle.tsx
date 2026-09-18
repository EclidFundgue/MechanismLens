import "./SubtitleToggle.css";

interface Props {
  visible: boolean;
  onToggle(): void;
}

/**
 * Hidden-on-hover subtitle toggle, fixed bottom-left. Mirrors AutoToggle:
 * default opacity 0, the corner reveals it on hover, so it stays out of the
 * screen recording. `data-no-advance` keeps the click from advancing the
 * stage. Also bound to the `S` key (see useSubtitle).
 */
export function SubtitleToggle({ visible, onToggle }: Props) {
  return (
    <div className="st-hover" data-no-advance>
      <button
        className={`st-btn ${visible ? "st-on" : "st-off"}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title="切换字幕（S）"
      >
        <span className="st-dot" />
        <span className="st-label">SUBTITLE {visible ? "ON" : "OFF"}</span>
      </button>
    </div>
  );
}
