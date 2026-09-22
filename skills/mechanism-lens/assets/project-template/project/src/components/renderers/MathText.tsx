import katex from "katex";

export function MathText({ tex, macros, displayMode = false }: { tex: string; macros?: Record<string, string>; displayMode?: boolean }) {
  try {
    const html = katex.renderToString(tex, {
      displayMode,
      throwOnError: true,
      trust: false,
      output: "htmlAndMathml",
      macros: { ...macros },
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span className="renderer-error" role="alert">无法排版公式，请核对 LaTeX：<code>{tex}</code></span>;
  }
}
