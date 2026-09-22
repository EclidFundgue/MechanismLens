import type { Evidence, SourceInfo } from "../types";

export function assetUrl(value: string): string {
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, "")}`;
}

function withFragment(url: string, fragment: string): string {
  return `${url.split("#")[0]}#${fragment}`;
}

export function sourceHome(source: SourceInfo): string | null {
  if (source.kind === "code") return source.sourceType === "git" && /^https?:/i.test(source.location ?? "") ? source.location ?? null : null;
  return source.localPath ? assetUrl(source.localPath) : source.url || source.pdfUrl || null;
}

export function evidenceUrl(evidence: Evidence, source?: SourceInfo): string | null {
  if (evidence.url) return evidence.url;
  if (!source || source.kind === "code") return sourceHome(source ?? { id: "", kind: "code", title: "" });
  const localPdf = source.localPath ? assetUrl(source.localPath) : "";
  if (evidence.page) {
    const pdf = localPdf || source.pdfUrl || source.url || "";
    return pdf ? withFragment(pdf, `page=${evidence.page}`) : null;
  }
  const base = localPdf || source.url || source.pdfUrl || "";
  return base ? (evidence.anchor ? withFragment(base, evidence.anchor) : base) : null;
}
