const DEFAULT_GAP = 64;

const sizeByKind = {
  node: { width: 190, height: 108 },
  card: { width: 280, height: 190 },
  annotation: { width: 260, height: 120 },
  equation: { width: 920, height: 420 },
  code: { width: 940, height: 450 },
  chart: { width: 940, height: 460 },
  image: { width: 940, height: 520 },
};

function sizeOf(object) {
  const fallback = sizeByKind[object.kind] ?? sizeByKind.card;
  return {
    width: Number.isFinite(object.width) && object.width > 0 ? object.width : fallback.width,
    height: Number.isFinite(object.height) && object.height > 0 ? object.height : fallback.height,
  };
}

function unionBounds(items) {
  if (items.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  const minX = Math.min(...items.map((item) => item.x));
  const minY = Math.min(...items.map((item) => item.y));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const maxY = Math.max(...items.map((item) => item.y + item.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function shiftBounds(bounds, dx, dy) {
  return { ...bounds, x: bounds.x + dx, y: bounds.y + dy };
}

function flow(items, direction, gap) {
  let cursor = 0;
  const placed = [];
  for (const item of items) {
    const x = direction === "vertical" ? 0 : cursor;
    const y = direction === "vertical" ? cursor : 0;
    placed.push({ ...item, x, y });
    cursor += (direction === "vertical" ? item.height : item.width) + gap;
  }
  return placed;
}

function layoutGraphObjects(sourceObjects, direction = "horizontal") {
  const objects = sourceObjects.map((object) => structuredClone(object));
  const byId = new Map(objects.map((object) => [object.id, object]));
  const children = new Map();
  for (const object of objects) {
    if (!object.parentId) continue;
    const list = children.get(object.parentId) ?? [];
    list.push(object.id);
    children.set(object.parentId, list);
  }

  const layouts = new Map();
  function measure(id) {
    if (layouts.has(id)) return layouts.get(id);
    const object = byId.get(id);
    if (!object) return { width: 1, height: 1, children: [] };
    if (object.kind !== "group") {
      const layout = { ...sizeOf(object), children: [] };
      layouts.set(id, layout);
      return layout;
    }
    const childIds = children.get(id) ?? [];
    const childLayouts = childIds.map((childId) => ({ id: childId, ...measure(childId) }));
    const childDirection = object.layout?.direction ?? "vertical";
    const placed = flow(childLayouts, childDirection, object.layout?.gap ?? 30);
    const content = unionBounds(placed.length > 0 ? placed : [{ x: 0, y: 0, width: 140, height: 70 }]);
    const padding = object.layout?.padding ?? 28;
    const titleHeight = 34;
    const layout = {
      width: content.width + padding * 2,
      height: content.height + padding * 2 + titleHeight,
      children: placed.map((item) => ({ ...item, x: item.x + padding, y: item.y + padding + titleHeight })),
    };
    layouts.set(id, layout);
    return layout;
  }

  const roots = objects.filter((object) => !object.parentId || !byId.has(object.parentId));
  const rootLayouts = roots.map((object) => ({ id: object.id, ...measure(object.id) }));
  const placedRoots = flow(rootLayouts, direction, DEFAULT_GAP);
  const output = [];

  function materialize(id, x, y) {
    const source = byId.get(id);
    const layout = layouts.get(id);
    output.push({ ...source, x, y, width: layout.width, height: layout.height });
    for (const child of layout.children) materialize(child.id, x + child.x, y + child.y);
  }
  for (const root of placedRoots) materialize(root.id, root.x, root.y);
  return output;
}

function layoutCards(objects) {
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(objects.length))));
  return objects.map((object, index) => {
    const size = sizeOf(object);
    return { ...structuredClone(object), x: (index % columns) * (size.width + 34), y: Math.floor(index / columns) * (size.height + 34), ...size };
  });
}

function layoutLayered(objects, relations) {
  if (objects.some((object) => object.kind === "group" || object.parentId)) return layoutGraphObjects(objects, "horizontal");
  const ids = new Set(objects.map((object) => object.id));
  const incoming = new Map(objects.map((object) => [object.id, 0]));
  const outgoing = new Map(objects.map((object) => [object.id, []]));
  for (const relation of relations ?? []) {
    if (!ids.has(relation.from) || !ids.has(relation.to)) continue;
    incoming.set(relation.to, (incoming.get(relation.to) ?? 0) + 1);
    outgoing.get(relation.from).push(relation.to);
  }
  const levels = new Map(objects.map((object) => [object.id, 0]));
  const queue = objects.filter((object) => incoming.get(object.id) === 0).map((object) => object.id);
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    visited += 1;
    for (const target of outgoing.get(id) ?? []) {
      levels.set(target, Math.max(levels.get(target) ?? 0, (levels.get(id) ?? 0) + 1));
      incoming.set(target, incoming.get(target) - 1);
      if (incoming.get(target) === 0) queue.push(target);
    }
  }
  if (visited !== objects.length) return layoutGraphObjects(objects, "horizontal");
  const layers = new Map();
  for (const object of objects) {
    const level = levels.get(object.id) ?? 0;
    const layer = layers.get(level) ?? [];
    layer.push(object);
    layers.set(level, layer);
  }
  const measured = [...layers.entries()].sort(([a], [b]) => a - b).map(([level, layer]) => ({
    level,
    objects: layer.map((object) => ({ ...structuredClone(object), ...sizeOf(object) })),
  }));
  const layerHeights = measured.map((layer) => layer.objects.reduce((sum, object) => sum + object.height, 0) + Math.max(0, layer.objects.length - 1) * 30);
  const maxHeight = Math.max(...layerHeights, 1);
  let x = 0;
  const output = [];
  for (const [index, layer] of measured.entries()) {
    const width = Math.max(...layer.objects.map((object) => object.width));
    let y = (maxHeight - layerHeights[index]) / 2;
    for (const object of layer.objects) {
      output.push({ ...object, x, y });
      y += object.height + 30;
    }
    x += width + 80;
  }
  return output;
}

function layoutSingle(objects) {
  let y = 0;
  return objects.map((object) => {
    const size = sizeOf(object);
    const placed = { ...structuredClone(object), x: 0, y, ...size };
    y += size.height + 34;
    return placed;
  });
}

function anchorsFor(object) {
  const anchors = [];
  if (object.kind === "equation" && Array.isArray(object.parts)) {
    const count = Math.max(1, object.parts.length);
    const width = (object.width - 60 - (count - 1) * 18) / count;
    for (const [index, part] of object.parts.entries()) {
      anchors.push({ id: part.id, ownerId: object.id, bounds: { x: object.x + 30 + index * (width + 18), y: object.y + object.height - 170, width, height: 130 } });
    }
  }
  if (object.kind === "code" && Array.isArray(object.lines)) {
    const lineHeight = Math.min(62, Math.max(42, (object.height - 70) / Math.max(1, object.lines.length)));
    for (const [index, line] of object.lines.entries()) {
      anchors.push({ id: line.id, ownerId: object.id, bounds: { x: object.x + 20, y: object.y + 54 + index * lineHeight, width: object.width * .62, height: lineHeight - 5 } });
    }
  }
  if (object.kind === "chart" && Array.isArray(object.items)) {
    const rowHeight = Math.min(62, Math.max(42, (object.height - 85) / Math.max(1, object.items.length)));
    for (const [index, item] of object.items.entries()) {
      anchors.push({ id: item.id, ownerId: object.id, bounds: { x: object.x + 18, y: object.y + 50 + index * rowHeight, width: object.width - 36, height: rowHeight - 5 } });
    }
  }
  if (object.kind === "image" && Array.isArray(object.regions)) {
    for (const region of object.regions) {
      anchors.push({
        id: region.id,
        ownerId: object.id,
        bounds: {
          x: object.x + region.x * object.width,
          y: object.y + region.y * object.height,
          width: region.width * object.width,
          height: region.height * object.height,
        },
      });
    }
  }
  return anchors;
}

function edgePath(from, to) {
  const ax = from.x + from.width / 2;
  const ay = from.y + from.height / 2;
  const bx = to.x + to.width / 2;
  const by = to.y + to.height / 2;
  const horizontal = Math.abs(bx - ax) >= Math.abs(by - ay);
  const x1 = horizontal ? (bx >= ax ? from.x + from.width : from.x) : ax;
  const y1 = horizontal ? ay : (by >= ay ? from.y + from.height : from.y);
  const x2 = horizontal ? (bx >= ax ? to.x : to.x + to.width) : bx;
  const y2 = horizontal ? by : (by >= ay ? to.y : to.y + to.height);
  if (horizontal) {
    const control = Math.max(45, Math.abs(x2 - x1) * .45);
    const sign = x2 >= x1 ? 1 : -1;
    return { x1, y1, x2, y2, path: `M ${x1} ${y1} C ${x1 + sign * control} ${y1}, ${x2 - sign * control} ${y2}, ${x2} ${y2}` };
  }
  const control = Math.max(45, Math.abs(y2 - y1) * .45);
  const sign = y2 >= y1 ? 1 : -1;
  return { x1, y1, x2, y2, path: `M ${x1} ${y1} C ${x1} ${y1 + sign * control}, ${x2} ${y2 - sign * control}, ${x2} ${y2}` };
}

export function union(items) {
  return unionBounds(items);
}

export function expand(bounds, padding) {
  return { x: bounds.x - padding, y: bounds.y - padding, width: bounds.width + padding * 2, height: bounds.height + padding * 2 };
}

export function layoutWorld(source) {
  const graphTemplates = new Set(["grouped_overview", "branch_merge_pipeline", "encoder_decoder", "training_inference_dual_view"]);
  let objects;
  if (source.templateId === "branch_merge_pipeline") objects = layoutLayered(source.objects, source.relations);
  else if (graphTemplates.has(source.templateId)) objects = layoutGraphObjects(source.objects, source.layout?.direction ?? "horizontal");
  else if (source.templateId === "concept_sequence") objects = layoutCards(source.objects);
  else objects = layoutSingle(source.objects);

  const anchors = objects.flatMap(anchorsFor);
  const contentBounds = unionBounds(objects.map(({ x, y, width, height }) => ({ x, y, width, height })));
  const offsetX = 80 - contentBounds.x;
  const offsetY = 80 - contentBounds.y;
  const shiftedObjects = objects.map((object) => ({ ...object, x: object.x + offsetX, y: object.y + offsetY }));
  const shiftedMap = new Map(shiftedObjects.map((object) => [object.id, object]));
  const shiftedRelations = (source.relations ?? []).map((relation) => {
    const from = shiftedMap.get(relation.from);
    const to = shiftedMap.get(relation.to);
    return { ...structuredClone(relation), ...(from && to ? edgePath(from, to) : {}) };
  });
  const shiftedAnchors = anchors.map((anchor) => ({ ...anchor, bounds: shiftBounds(anchor.bounds, offsetX, offsetY) }));
  const shiftedBounds = shiftBounds(contentBounds, offsetX, offsetY);
  return {
    ...structuredClone(source),
    objects: shiftedObjects,
    relations: shiftedRelations,
    anchors: shiftedAnchors,
    bounds: expand(shiftedBounds, 80),
  };
}

export function targetBounds(world, ids, mode = "contextual") {
  const objectMap = new Map(world.objects.map((object) => [object.id, object]));
  const anchorMap = new Map(world.anchors.map((anchor) => [anchor.id, anchor]));
  const targets = ids.flatMap((id) => {
    const object = objectMap.get(id);
    if (object) return [object];
    const anchor = anchorMap.get(id);
    if (!anchor) return [];
    if (mode === "contextual") return [anchor.bounds, objectMap.get(anchor.ownerId)].filter(Boolean);
    return [anchor.bounds];
  });
  if (targets.length === 0) return world.bounds;
  const padding = mode === "tight" ? 32 : mode === "fit" ? 64 : 96;
  return expand(unionBounds(targets), padding);
}
