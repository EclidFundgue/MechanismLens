import { useId, useState } from "react";
import type { Scene, SceneStep } from "../../types";
import { assetUrl } from "../../lib/source";
import { list, regionViewBox, stepState, text, type Callout } from "./model";

export function FigureInspector({ scene, step }: { scene: Scene; step: SceneStep }) {
  const [failed, setFailed] = useState(false), state = stepState(step);
  const src = text(scene.payload, "src"), alt = text(scene.payload, "alt", scene.title), caption = text(scene.payload, "caption");
  const width = typeof scene.payload.imageWidth === "number" ? scene.payload.imageWidth : 1000;
  const height = typeof scene.payload.imageHeight === "number" ? scene.payload.imageHeight : 600;
  const callouts = list<Callout>(scene.payload, "callouts");
  const regionId = state.zoomRegionId ?? step.focusIds?.find((id) => callouts.some((callout) => callout.id === id)) ?? null;
  const region = callouts.find((callout) => callout.id === regionId);
  const clipId = `figure-crop-${useId().replace(/:/g, "")}`;
  if (!src) return <div className="figure-placeholder">Add the paper figure to project/public/assets</div>;
  if (failed) return <p className="math-error" role="alert">无法加载原图：{src}</p>;
  const image = assetUrl(src);
  const crop = regionViewBox(region, width, height).split(" ").map(Number);
  return <figure className="figure-inspector"><div className="figure-pair">
    <div><h3>原图概览</h3><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={alt}><image href={image} width={width} height={height} onError={() => setFailed(true)} />
      {region && <rect className="figure-callout" data-region={region.id} x={(region.x ?? 0) / 100 * width} y={(region.y ?? 0) / 100 * height} width={(region.width ?? 0) / 100 * width} height={(region.height ?? 0) / 100 * height} vectorEffect="non-scaling-stroke" />}
    </svg></div>
    <div><h3>{region?.label ?? "全图"}</h3><svg className="figure-zoom" viewBox={regionViewBox(region, width, height)} role="img" aria-label={region ? `局部放大：${region.label}` : alt}>
      <defs><clipPath id={clipId}><rect x={crop[0]} y={crop[1]} width={crop[2]} height={crop[3]} /></clipPath></defs><image href={image} width={width} height={height} clipPath={`url(#${clipId})`} onError={() => setFailed(true)} />
    </svg></div>
  </div>{caption && <figcaption>{caption}</figcaption>}</figure>;
}
