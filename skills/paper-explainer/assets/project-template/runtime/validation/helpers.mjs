export function validationIssue(code, path, message, context = {}) {
  return { code, path, message, ...context };
}

export function addIssue(issues, code, path, message, context) {
  issues.push(validationIssue(code, path, message, context));
}

export function requireString(value, label, path, issues, context) {
  if (typeof value !== "string" || value.trim() === "") {
    addIssue(issues, "REQUIRED_STRING", path, `${label} must be a non-empty string`, context);
  }
}

export function checkRefs(ids, known, label, path, issues, context) {
  for (const [index, id] of (ids ?? []).entries()) {
    if (!known.has(id)) addIssue(issues, "MISSING_REFERENCE", `${path}/${index}`, `${label} references missing id: ${id}`, context);
  }
}
