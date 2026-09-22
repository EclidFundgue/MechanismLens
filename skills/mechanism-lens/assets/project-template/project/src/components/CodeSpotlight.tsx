import type { Evidence } from "../types";

export function CodeSpotlight({ evidence }: { evidence: Evidence[] }) {
  const codeEvidence = evidence.filter((item) => item.kind === "code");
  if (codeEvidence.length === 0) return null;
  return <aside className="code-spotlight" aria-label="当前源码证据">
    <div className="code-spotlight-head"><span className="kicker">Code spotlight</span><strong>{codeEvidence.length} source{codeEvidence.length === 1 ? "" : "s"}</strong></div>
    <div className="code-spotlight-list">{codeEvidence.map((item) => {
      const lines = (item.excerpt ?? "").split(/\r?\n/), first = item.lineStart ?? 1;
      return <article key={item.id}><div className="code-location"><strong>{item.path}</strong><span>{[item.symbol, item.lineStart ? `L${item.lineStart}${item.lineEnd && item.lineEnd !== item.lineStart ? `–${item.lineEnd}` : ""}` : ""].filter(Boolean).join(" · ")}</span></div>
        <pre>{lines.map((line, index) => <span className="code-row" key={`${item.id}-${index}`}><b>{first + index}</b><code>{line || " "}</code></span>)}</pre>
      </article>;
    })}</div>
  </aside>;
}
