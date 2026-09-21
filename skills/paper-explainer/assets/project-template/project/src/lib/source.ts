import type { Evidence, PaperIR } from "../types";

export function assetUrl(value: string): string {
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, "")}`;
}

function withFragment(url: string, fragment: string): string {
  const clean = url.split("#")[0];
  return `${clean}#${fragment}`;
}

export function evidenceUrl(evidence: Evidence, paper: PaperIR["paper"]): string | null {
  if (evidence.url) return evidence.url;

  const localPdf = paper.localPdfPath ? assetUrl(paper.localPdfPath) : "";
  if (evidence.page) {
    const pdf = localPdf || paper.pdfUrl || paper.originalUrl;
    return pdf ? withFragment(pdf, `page=${evidence.page}`) : null;
  }

  const base = localPdf || paper.originalUrl || paper.pdfUrl || "";
  if (!base) return null;
  return evidence.anchor ? withFragment(base, evidence.anchor) : base;
}
