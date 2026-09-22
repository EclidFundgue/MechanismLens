export function issue(code, path, message, context = {}) {
  return { code, path, message, ...context };
}

export function add(list, code, path, message, context) {
  list.push(issue(code, path, message, context));
}

export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function requireObject(value, path, errors, context = {}) {
  if (isObject(value)) return value;
  add(errors, "EXPECTED_OBJECT", path, `${path || "value"} must be an object`, context);
  return {};
}

export function requireArray(value, path, errors, context = {}) {
  if (Array.isArray(value)) return value;
  add(errors, "EXPECTED_ARRAY", path, `${path || "value"} must be an array`, context);
  return [];
}

export function requireString(value, path, errors, context = {}) {
  if (typeof value === "string" && value.trim() !== "") return value;
  add(errors, "REQUIRED_STRING", path, `${path || "value"} must be a non-empty string`, context);
  return null;
}

export function collect(itemsValue, path, errors, context = {}) {
  const items = requireArray(itemsValue, path, errors, context);
  const ids = new Set();
  for (const [index, value] of items.entries()) {
    const itemPath = `${path}/${index}`;
    if (!isObject(value)) {
      add(errors, "EXPECTED_OBJECT", itemPath, `${itemPath} must be an object`, context);
      continue;
    }
    const id = requireString(value.id, `${itemPath}/id`, errors, context);
    if (!id) continue;
    if (ids.has(id)) add(errors, "DUPLICATE_ID", `${itemPath}/id`, `duplicate id: ${id}`, context);
    ids.add(id);
  }
  return { items, ids };
}

export function checkRefs(value, known, path, errors, context = {}, { optional = true } = {}) {
  if (value === undefined && optional) return [];
  const refs = requireArray(value, path, errors, context);
  const seen = new Set();
  for (const [index, ref] of refs.entries()) {
    if (typeof ref !== "string" || ref.trim() === "") {
      add(errors, "INVALID_ID", `${path}/${index}`, `${path}/${index} must be a non-empty string`, context);
      continue;
    }
    if (seen.has(ref)) add(errors, "DUPLICATE_REFERENCE", `${path}/${index}`, `${path} repeats ${ref}`, context);
    else seen.add(ref);
    if (!known.has(ref)) add(errors, "MISSING_REFERENCE", `${path}/${index}`, `${path} references missing id: ${ref}`, context);
  }
  return refs;
}

export function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}
