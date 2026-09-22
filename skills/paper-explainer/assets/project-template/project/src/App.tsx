import { useCallback, useEffect, useMemo, useState } from "react";
import { paperIR, sceneIR } from "./data";
import { EvidenceDrawer } from "./components/EvidenceDrawer";
import { WorldStage } from "./stage/WorldStage";
import { usePlayerKeyboard } from "./hooks/usePlayerKeyboard";
import { assetUrl } from "./lib/source";
import type { CameraPhase } from "./camera/useCameraViewBox";

function unique<T>(items: T[]): T[] { return [...new Set(items)]; }

function initialCursor() {
  const fallback = { sceneId: sceneIR.scenes[0]?.id ?? "", stepId: sceneIR.scenes[0]?.steps[0]?.id ?? "" };
  if (new URLSearchParams(window.location.search).get("reset") === "1") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`paper-explainer:v2:${paperIR.paper.id}:cursor`) ?? "null");
    if (typeof parsed?.sceneId === "string" && typeof parsed?.stepId === "string") return parsed;
  } catch { /* ignore stale state */ }
  return fallback;
}

export function App() {
  const [cursor, setCursor] = useState(initialCursor);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [subtitles, setSubtitles] = useState(true);
  const [auto, setAuto] = useState(new URLSearchParams(window.location.search).get("auto") === "1");
  const [cameraStatus, setCameraStatus] = useState<{ stepId: string; phase: CameraPhase }>({ stepId: "", phase: "locating" });

  const sceneIndex = Math.max(0, sceneIR.scenes.findIndex((item) => item.id === cursor.sceneId));
  const scene = sceneIR.scenes[sceneIndex];
  const stepIndex = Math.max(0, scene.steps.findIndex((item) => item.id === cursor.stepId));
  const step = scene.steps[stepIndex];
  const world = sceneIR.worlds.find((item) => item.id === scene.worldId)!;
  const previousStep = scene.steps[stepIndex - 1];
  const reserveDetailSpace = scene.steps.some((item) => item.visual.detailViewId !== null);
  const cameraSettled = cameraStatus.stepId === step.id && cameraStatus.phase === "settled";
  const handleCameraPhaseChange = useCallback((stepId: string, phase: CameraPhase) => setCameraStatus({ stepId, phase }), []);

  const claimMap = useMemo(() => new Map(paperIR.claims.map((claim) => [claim.id, claim])), []);
  const evidenceMap = useMemo(() => new Map(paperIR.evidence.map((item) => [item.id, item])), []);
  const semanticMap = useMemo(() => new Map([
    ...paperIR.contributions, ...paperIR.concepts, ...paperIR.modules, ...paperIR.relations,
    ...paperIR.equations, ...paperIR.algorithms, ...paperIR.experiments, ...paperIR.figures,
  ].map((item) => [item.id, item])), []);
  const currentEvidence = useMemo(() => {
    const claimEvidence = scene.claimIds.flatMap((id) => claimMap.get(id)?.evidenceIds ?? []);
    const anchorOwners = new Map(world.anchors.map((anchor) => [anchor.id, anchor.ownerId]));
    const activeObjectIds = new Set(step.visual.emphasisIds.map((id) => anchorOwners.get(id) ?? id));
    const visualEvidence = world.objects.filter((object) => activeObjectIds.has(object.id)).flatMap((object) => [
      ...(object.evidenceIds ?? []), ...(object.paperRef ? semanticMap.get(object.paperRef)?.evidenceIds ?? [] : []),
    ]);
    const relationEvidence = world.relations.filter((relation) => step.visual.activeRelationIds.includes(relation.id)).flatMap((relation) => {
      const source = relation as typeof relation & { evidenceIds?: string[]; paperRef?: string };
      return [...(source.evidenceIds ?? []), ...(source.paperRef ? semanticMap.get(source.paperRef)?.evidenceIds ?? [] : [])];
    });
    const ids = unique([...scene.evidenceIds, ...step.evidenceIds, ...claimEvidence, ...visualEvidence, ...relationEvidence]);
    return ids.map((id) => evidenceMap.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [claimMap, evidenceMap, scene, semanticMap, step, world]);

  const totalSteps = sceneIR.scenes.reduce((total, item) => total + item.steps.length, 0);
  const completedBefore = sceneIR.scenes.slice(0, sceneIndex).reduce((total, item) => total + item.steps.length, 0);
  const absoluteStep = completedBefore + stepIndex + 1;

  const jump = useCallback((nextSceneIndex: number, nextStepIndex = 0) => {
    const boundedSceneIndex = Math.max(0, Math.min(nextSceneIndex, sceneIR.scenes.length - 1));
    const nextScene = sceneIR.scenes[boundedSceneIndex];
    const boundedStepIndex = Math.max(0, Math.min(nextStepIndex, nextScene.steps.length - 1));
    setCursor({ sceneId: nextScene.id, stepId: nextScene.steps[boundedStepIndex].id });
  }, []);
  const next = useCallback(() => {
    if (stepIndex < scene.steps.length - 1) jump(sceneIndex, stepIndex + 1);
    else if (sceneIndex < sceneIR.scenes.length - 1) jump(sceneIndex + 1, 0);
    else setAuto(false);
  }, [jump, scene.steps.length, sceneIndex, stepIndex]);
  const previous = useCallback(() => {
    if (stepIndex > 0) jump(sceneIndex, stepIndex - 1);
    else if (sceneIndex > 0) jump(sceneIndex - 1, sceneIR.scenes[sceneIndex - 1].steps.length - 1);
  }, [jump, sceneIndex, stepIndex]);
  const home = useCallback(() => jump(0, 0), [jump]);
  const toggleSubtitles = useCallback(() => setSubtitles((value) => !value), []);
  const toggleEvidence = useCallback(() => setEvidenceOpen((value) => !value), []);
  usePlayerKeyboard({ next, previous, home, toggleSubtitles, toggleEvidence });

  useEffect(() => {
    window.localStorage.setItem(`paper-explainer:v2:${paperIR.paper.id}:cursor`, JSON.stringify({ sceneId: scene.id, stepId: step.id }));
  }, [scene.id, step.id]);
  useEffect(() => {
    if (!auto || !cameraSettled) return;
    const timer = window.setTimeout(next, step.timing.holdMs);
    return () => window.clearTimeout(timer);
  }, [auto, cameraSettled, next, scene.id, step.id, step.timing.holdMs]);

  const originalPaperUrl = paperIR.paper.localPdfPath ? assetUrl(paperIR.paper.localPdfPath) : paperIR.paper.originalUrl || paperIR.paper.pdfUrl || null;
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-block"><span className="brand-mark">PE</span><div><span className="kicker">Paper Explainer</span><strong>{paperIR.paper.title}</strong></div></div>
      <div className="header-actions">{originalPaperUrl && <a className="quiet-link" href={originalPaperUrl} target="_blank" rel="noreferrer">查看论文 ↗</a>}<button className="evidence-button" onClick={() => setEvidenceOpen(true)}>论文依据 <span>{currentEvidence.length}</span></button></div>
    </header>
    <nav className="scene-nav" aria-label="讲解章节">
      <div className="nav-title"><span className="kicker">Walkthrough</span><strong>{sceneIR.title ?? "Contents"}</strong></div>
      <ol>{sceneIR.scenes.map((item, index) => <li key={item.id}><button className={index === sceneIndex ? "is-current" : ""} onClick={() => jump(index, 0)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><small>{item.steps.length} steps · {item.contentKind}</small></div></button></li>)}</ol>
      <div className="paper-summary"><span className="kicker">Paper in one line</span><p>{paperIR.paper.summary}</p></div>
    </nav>
    <main className="stage-area">
      <section className="stage" aria-live="polite">
        <div className="stage-heading"><div><span className="kicker">{scene.eyebrow ?? scene.contentKind}</span><h1>{scene.title}</h1></div><div className="step-counter"><span>{String(stepIndex + 1).padStart(2, "0")}</span><small>/ {String(scene.steps.length).padStart(2, "0")}</small></div></div>
        <div className="visual-stage"><WorldStage key={world.id} world={world} step={step} previousStep={previousStep} reserveDetailSpace={reserveDetailSpace} onCameraPhaseChange={handleCameraPhaseChange} /></div>
        {subtitles && <div className={`subtitle ${cameraSettled ? "" : "is-locating"}`} aria-live={cameraSettled ? "polite" : "off"}>{cameraSettled ? <><span>{step.title ?? "Explanation"}</span><p>{step.narration}</p></> : <><span>Locating</span><p>正在定位讲解画面…</p></>}</div>}
      </section>
      <footer className="player-controls"><div className="progress-track"><span style={{ width: `${(absoluteStep / totalSteps) * 100}%` }} /></div><div className="control-row"><span>{absoluteStep} / {totalSteps}</span><div><button onClick={previous} disabled={absoluteStep === 1}>←</button><button className={auto ? "is-active" : ""} onClick={() => setAuto((value) => !value)}>{auto ? "暂停" : "自动播放"}</button><button onClick={next} disabled={absoluteStep === totalSteps}>→</button></div><button className="subtitle-toggle" onClick={() => setSubtitles((value) => !value)}>字幕 {subtitles ? "开" : "关"}</button></div></footer>
    </main>
    <EvidenceDrawer evidence={currentEvidence} paper={paperIR.paper} open={evidenceOpen} onClose={() => setEvidenceOpen(false)} />
    {evidenceOpen && <button className="drawer-scrim" onClick={() => setEvidenceOpen(false)} aria-label="关闭证据面板" />}
  </div>;
}
