import { useId, useState } from "react";
import { assetUrl } from "../../lib/source";
import { regionViewBox, resolveRegionId } from "../renderer-model";
import type { Callout, ImageInfo, Region, RendererProps } from "./shared";
import { focusClass, focusFor, list, text } from "./shared";

function FigureImage({ scene, step }: RendererProps) {
  const [failed, setFailed] = useState(false);
  const clipId = `renderer-crop-${useId().replace(/:/g, "")}`;
  const image = scene.payload.image as ImageInfo;
  const regions = list<Region>(scene.payload, "regions");
  const requested = resolveRegionId(step.visual?.regionId, step.focusIds, new Set(regions.map((region) => region.id)));
  const region = regions.find((item) => item.id === requested);
  const src = assetUrl(image.src);
  if (failed) return <p className="renderer-error" role="alert">无法加载原图：{image.src}</p>;
  return <figure className="renderer-figure">
    <div className="renderer-figure-pair">
      <div><h3>原图概览</h3><svg viewBox={`0 0 ${image.width} ${image.height}`} role="img" aria-label={image.alt}>
        <image href={src} width={image.width} height={image.height} onError={() => setFailed(true)} />
        {region && <rect className="renderer-region" x={region.x * image.width} y={region.y * image.height} width={region.width * image.width} height={region.height * image.height} vectorEffect="non-scaling-stroke" />}
      </svg></div>
      <div><h3>{region?.label ?? "全图"}</h3><svg className="renderer-zoom" viewBox={regionViewBox(region, image.width, image.height)} role="img" aria-label={region ? `局部放大：${region.label}` : image.alt}>
        <defs><clipPath id={clipId}><rect x={(region?.x ?? 0) * image.width} y={(region?.y ?? 0) * image.height} width={(region?.width ?? 1) * image.width} height={(region?.height ?? 1) * image.height} /></clipPath></defs>
        <image href={src} width={image.width} height={image.height} clipPath={`url(#${clipId})`} onError={() => setFailed(true)} />
      </svg></div>
    </div>
    {text(scene.payload, "caption") && <figcaption>{text(scene.payload, "caption")}</figcaption>}
  </figure>;
}

export function FigureInspector({ scene, step }: RendererProps) {
  const focus = focusFor(step);
  const image = scene.payload.image as ImageInfo | undefined;
  if (image) return <FigureImage key={image.src} scene={scene} step={step} />;
  const src = text(scene.payload, "src"), alt = text(scene.payload, "alt", scene.title);
  const callouts = list<Callout>(scene.payload, "callouts");
  return <figure className="figure-inspector"><div className="figure-canvas">
    {src ? <img src={assetUrl(src)} alt={alt} /> : <div className="figure-placeholder">Add the paper figure to project/public/assets</div>}
    {callouts.map((callout) => <span key={callout.id} className={`figure-callout ${focusClass(callout.id, focus)}`}
      style={{ left: `${callout.x ?? 10}%`, top: `${callout.y ?? 10}%`, width: `${callout.width ?? 20}%`, height: `${callout.height ?? 20}%` }}>{callout.label}</span>)}
  </div>{text(scene.payload, "caption") && <figcaption>{text(scene.payload, "caption")}</figcaption>}</figure>;
}
