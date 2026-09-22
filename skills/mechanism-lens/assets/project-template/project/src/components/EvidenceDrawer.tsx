import type { Evidence, PaperIR } from "../types";
import { evidenceUrl } from "../lib/source";

interface Props {
  evidence: Evidence[];
  paper: PaperIR["paper"];
  open: boolean;
  onClose: () => void;
}

export function EvidenceDrawer({ evidence, paper, open, onClose }: Props) {
  if (!open) return null;
  return (
    <aside className="evidence-drawer is-open" aria-label="论文证据">
      <div className="evidence-head">
        <div>
          <span className="kicker">Evidence mode</span>
          <h2>论文依据</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="关闭证据面板">×</button>
      </div>

      <div className="evidence-list">
        {evidence.length === 0 ? (
          <p className="empty-copy">当前步骤还没有绑定来源。</p>
        ) : evidence.map((item) => {
          const href = evidenceUrl(item, paper);
          return (
            <article className="evidence-card" key={item.id}>
              <div className="evidence-meta">
                <span>{item.kind ?? "source"}</span>
                <span>{item.confidence === "derived" ? "系统解读" : "论文原文"}</span>
              </div>
              <h3>{item.label}</h3>
              {(item.section || item.page) && (
                <p className="locator">{[item.section, item.page ? `PDF p.${item.page}` : ""].filter(Boolean).join(" · ")}</p>
              )}
              {item.excerpt && <blockquote>{item.excerpt}</blockquote>}
              {href ? (
                <a className="source-link" href={href} target="_blank" rel="noreferrer">
                  跳转到论文原文 <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span className="source-link is-disabled">未配置原文链接</span>
              )}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
