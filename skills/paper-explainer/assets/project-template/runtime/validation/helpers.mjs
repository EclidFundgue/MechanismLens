export function validationIssue(code, path, message, context = {}) {
  return { code, path, message, ...context };
}

export function addIssue(issues, code, path, message, context) {
  issues.push(validationIssue(code, path, message, context));
}

export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function requireObject(value, label, path, issues, context) {
  if (isObject(value)) return value;
  addIssue(issues, "EXPECTED_OBJECT", path, `${label} must be an object`, context);
  return null;
}

export function optionalArray(value, label, path, issues, context) {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  addIssue(issues, "EXPECTED_ARRAY", path, `${label} must be an array`, context);
  return [];
}

export function requireArray(value, label, path, issues, context) {
  if (Array.isArray(value)) return value;
  addIssue(issues, "EXPECTED_ARRAY", path, `${label} must be an array`, context);
  return [];
}

export function requireString(value, label, path, issues, context) {
  if (typeof value === "string" && value.trim() !== "") return value;
  addIssue(issues, "REQUIRED_STRING", path, `${label} must be a non-empty string`, context);
  return null;
}

export function optionalString(value, label, path, issues, context) {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  addIssue(issues, "EXPECTED_STRING", path, `${label} must be a string`, context);
  return undefined;
}

export function collectIds(value, label, path, issues, context, { required = false } = {}) {
  const items = required
    ? requireArray(value, label, path, issues, context)
    : optionalArray(value, label, path, issues, context);
  const ids = new Set();
  for (const [index, item] of items.entries()) {
    if (!isObject(item)) {
      addIssue(issues, "EXPECTED_OBJECT", `${path}/${index}`, `${label}[${index}] must be an object`, context);
      continue;
    }
    const id = requireString(item.id, `${label}[${index}].id`, `${path}/${index}/id`, issues, context);
    if (id === null) continue;
    if (ids.has(id)) addIssue(issues, "DUPLICATE_ID", `${path}/${index}/id`, `duplicate ${label} id: ${id}`, context);
    else ids.add(id);
  }
  return { ids, items };
}

export function checkRefs(value, known, label, path, issues, context) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    addIssue(issues, "EXPECTED_ID_ARRAY", path, `${label} must be an array of ids`, context);
    return null;
  }
  const valid = [];
  const seen = new Set();
  for (const [index, id] of value.entries()) {
    if (typeof id !== "string" || id.trim() === "") {
      addIssue(issues, "INVALID_ID", `${path}/${index}`, `${label}[${index}] must be a non-empty string`, context);
      continue;
    }
    if (seen.has(id)) addIssue(issues, "DUPLICATE_REFERENCE", `${path}/${index}`, `${label} must not contain duplicate ids: ${id}`, context);
    else seen.add(id);
    if (!known.has(id)) addIssue(issues, "MISSING_REFERENCE", `${path}/${index}`, `${label} references missing id: ${id}`, context);
    valid.push(id);
  }
  return valid;
}

export function requireFinite(value, label, path, issues, context) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  addIssue(issues, "INVALID_NUMBER", path, `${label} must be finite`, context);
  return null;
}

export function warnMissingText(value, label, path, warnings, context) {
  if (typeof value !== "string" || value.trim() === "") {
    addIssue(warnings, "MISSING_DISPLAY_TEXT", path, `${label} is recommended for readable output`, context);
  }
}
