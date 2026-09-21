import { useCallback, useEffect, useMemo, useState } from "react";
import { paperIR, sceneIR } from "./data";
import { EvidenceDrawer } from "./components/EvidenceDrawer";
import { SceneRenderer } from "./components/SceneRenderer";
import { assetUrl } from "./lib/source";

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function initialCursor() {
  const reset = new URLSearchParams(window.location.search).get("reset") === "1";
  if (reset) return { scene: 0, step: 0 };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`paper-explainer:${paperIR.paper.id}:cursor`) ?? "null");
    if (Number.isInteger(parsed?.scene) && Number.isInteger(parsed?.step)) return parsed;
  } catch { /* ignore stale state */ }
  return { scene: 0, step: 0 };
}

export function App() {
  const [{ scene: sceneIndex, step: stepIndex }, setCursor] = useState(initialCursor);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [subtitles, setSubtitles] = useState(true);
  const [auto, setAuto] = useState(new URLSearchParams(window.location.search).get("auto") === "1");

  const safeSceneIndex = Math.max(0, Math.min(sceneIndex, sceneIR.scenes.length - 1));
  const scene = sceneIR.scenes[safeSceneIndex];
  const safeStepIndex = Math.max(0, Math.min(stepIndex, scene.steps.length - 1));
  const step = scene.steps[safeStepIndex];

  const claimMap = useMemo(() => new Map(paperIR.claims.map((claim) => [claim.id, claim])), []);
  const evidenceMap = useMemo(() => new Map(paperIR.evidence.map((item) => [item.id, item])), []);
  const currentEvidence = useMemo(() => {
    const claimEvidence = (scene.claimIds ?? []).flatMap((id) => claimMap.get(id)?.evidenceIds ?? []);
    const ids = unique([...(scene.evidenceIds ?? []), ...(step.evidenceIds ?? []), ...claimEvidence]);
    return ids.map((id) => evidenceMap.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [claimMap, evidenceMap, scene, step]);

  const totalSteps = sceneIR.scenes.reduce((total, item) => total + item.steps.length, 0);
  const completedBefore = sceneIR.scenes.slice(0, safeSceneIndex).reduce((total, item) => total + item.steps.length, 0);
  const absoluteStep = completedBefore + safeStepIndex + 1;

  const jump = useCallback((nextScene: number, nextStep = 0) => {
    const boundedScene = Math.max(0, Math.min(nextScene, sceneIR.scenes.length - 1));
    const boundedStep = Math.max(0, Math.min(nextStep, sceneIR.scenes[boundedScene].steps.length - 1));
    setCursor({ scene: boundedScene, step: boundedStep });
  }, []);

  const next = useCallback(() => {
    if (safeStepIndex < scene.steps.length - 1) jump(safeSceneIndex, safeStepIndex + 1);
    else if (safeSceneIndex < sceneIR.scenes.length - 1) jump(safeSceneIndex + 1, 0);
    else setAuto(false);
  }, [jump, safeSceneIndex, safeStepIndex, scene.steps.length]);

  const previous = useCallback(() => {
    if (safeStepIndex > 0) jump(safeSceneIndex, safeStepIndex - 1);
    else if (safeSceneIndex > 0) jump(safeSceneIndex - 1, sceneIR.scenes[safeSceneIndex - 1].steps.length - 1);
  }, [jump, safeSceneIndex, safeStepIndex]);

  useEffect(() => {
    window.localStorage.setItem(`paper-explainer:${paperIR.paper.id}:cursor`, JSON.stringify({ scene: safeSceneIndex, step: safeStepIndex }));
  }, [safeSceneIndex, safeStepIndex]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); next(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
      if (event.key === "Home") jump(0, 0);
      if (event.key.toLowerCase() === "s") setSubtitles((value) => !value);
      if (event.key.toLowerCase() === "e") setEvidenceOpen((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump, next, previous]);

  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(next, Math.max(1800, step.narration.length * 190));
    return () => window.clearTimeout(timer);
  }, [auto, next, scene.id, step.id, step.narration.length]);

  const originalPaperUrl = paperIR.paper.localPdfPath
    ? assetUrl(paperIR.paper.localPdfPath)
    : paperIR.paper.originalUrl || paperIR.paper.pdfUrl || null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark">PE</span>
          <div><span className="kicker">Paper Explainer</span><strong>{paperIR.paper.title}</strong></div>
        </div>
        <div className="header-actions">
          {originalPaperUrl && <a className="quiet-link" href={originalPaperUrl} target="_blank" rel="noreferrer">查看论文 ↗</a>}
          <button className="evidence-button" onClick={() => setEvidenceOpen(true)}>
            论文依据 <span>{currentEvidence.length}</span>
          </button>
        </div>
      </header>

      <nav className="scene-nav" aria-label="讲解章节">
        <div className="nav-title"><span className="kicker">Walkthrough</span><strong>{sceneIR.title ?? "Contents"}</strong></div>
        <ol>
          {sceneIR.scenes.map((item, index) => (
            <li key={item.id}>
              <button className={index === safeSceneIndex ? "is-current" : ""} onClick={() => jump(index, 0)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{item.title}</strong><small>{item.steps.length} steps · {item.type.replaceAll("_", " ")}</small></div>
              </button>
            </li>
          ))}
        </ol>
        <div className="paper-summary">
          <span className="kicker">Paper in one line</span>
          <p>{paperIR.paper.summary}</p>
        </div>
      </nav>

      <main className="stage-area">
        <section className="stage" aria-live="polite">
          <div className="stage-heading">
            <div><span className="kicker">{scene.eyebrow ?? scene.type.replaceAll("_", " ")}</span><h1>{scene.title}</h1></div>
            <div className="step-counter"><span>{String(safeStepIndex + 1).padStart(2, "0")}</span><small>/ {String(scene.steps.length).padStart(2, "0")}</small></div>
          </div>

          <div className="visual-stage"><SceneRenderer scene={scene} step={step} stepIndex={safeStepIndex} /></div>

          {subtitles && <div className="subtitle"><span>{step.title ?? "Explanation"}</span><p>{step.narration}</p></div>}
        </section>

        <footer className="player-controls">
          <div className="progress-track"><span style={{ width: `${(absoluteStep / totalSteps) * 100}%` }} /></div>
          <div className="control-row">
            <span>{absoluteStep} / {totalSteps}</span>
            <div>
              <button onClick={previous} disabled={absoluteStep === 1}>←</button>
              <button className={auto ? "is-active" : ""} onClick={() => setAuto((value) => !value)}>{auto ? "暂停" : "自动播放"}</button>
              <button onClick={next} disabled={absoluteStep === totalSteps}>→</button>
            </div>
            <button className="subtitle-toggle" onClick={() => setSubtitles((value) => !value)}>字幕 {subtitles ? "开" : "关"}</button>
          </div>
        </footer>
      </main>

      <EvidenceDrawer evidence={currentEvidence} paper={paperIR.paper} open={evidenceOpen} onClose={() => setEvidenceOpen(false)} />
      {evidenceOpen && <button className="drawer-scrim" onClick={() => setEvidenceOpen(false)} aria-label="关闭证据面板" />}
    </div>
  );
}
