import type { Evidence, SourceBundle } from "../types";
import { evidenceUrl } from "../lib/source";

const basisLabel = { source_fact: "来源事实", static_inference: "静态推导", runtime_observation: "运行观察" } as const;

export function SourceDrawer({ evidence, bundle, open, onClose }: { evidence: Evidence[]; bundle: SourceBundle; open: boolean; onClose: () => void }) {
  if (!open) return null;
  const sourceMap = new Map(bundle.sources.map((item) => [item.id, item]));
  return <aside className="evidence-drawer is-open" aria-label="来源依据">
    <div className="evidence-head"><div><span className="kicker">Evidence mode</span><h2>来源依据</h2></div><button className="icon-button" onClick={onClose} aria-label="关闭来源面板">×</button></div>
    <div className="evidence-list">
      {evidence.length === 0 ? <p className="empty-copy">当前步骤还没有绑定来源。</p> : evidence.map((item) => {
        const source = sourceMap.get(item.sourceId), href = evidenceUrl(item, source);
        const locator = item.kind === "code" ? [item.path, item.symbol, item.lineStart ? `L${item.lineStart}${item.lineEnd && item.lineEnd !== item.lineStart ? `–${item.lineEnd}` : ""}` : ""] : [item.section, item.page ? `PDF p.${item.page}` : ""];
        return <article className="evidence-card" key={item.id}>
          <div className="evidence-meta"><span>{item.kind ?? source?.kind ?? "source"}</span><span>{basisLabel[item.basis]}</span></div>
          <h3>{item.label}</h3><p className="locator">{locator.filter(Boolean).join(" · ")}</p>
          {item.excerpt && (item.kind === "code" ? <pre className="evidence-code"><code>{item.excerpt}</code></pre> : <blockquote>{item.excerpt}</blockquote>)}
          {href ? <a className="source-link" href={href} target="_blank" rel="noreferrer">查看来源 <span aria-hidden="true">↗</span></a> : <span className="source-link is-disabled">来源保存在生成项目中</span>}
        </article>;
      })}
    </div>
  </aside>;
}
