import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const script = path.resolve("skills/mechanism-lens/scripts/intake-code.py");

function pythonCommand() {
  const candidates = process.platform === "win32" ? [["py", ["-3"]], ["python", []]] : [["python3", []], ["python", []]];
  return candidates.find(([command, args]) => spawnSync(command, [...args, "--version"], { encoding: "utf8" }).status === 0) ?? null;
}

function runPython(candidate, args) {
  const [command, prefix] = candidate;
  return spawnSync(command, [...prefix, script, ...args], { encoding: "utf8" });
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

const python = pythonCommand();

test("local Code Intake extracts Python entities and evidence without repository state", { skip: !python && "Python is required" }, () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "mechanism-lens-code-local-"));
  try {
    const repository = path.join(scratch, "cache source"), project = path.join(scratch, "output");
    mkdirSync(repository, { recursive: true }); mkdirSync(path.join(project, "content"), { recursive: true });
    writeFileSync(path.join(repository, "cache.py"), `def load(key):\n    return key.upper()\n\ndef get(cache, key):\n    if key not in cache:\n        cache[key] = load(key)\n    return cache[key]\n`);
    const result = runPython(python, [repository, project, "--question", "What happens on a cache miss?", "--title", "Cache"]);
    assert.equal(result.status, 0, result.stderr);
    const code = JSON.parse(readFileSync(path.join(project, "content", "code-ir.json"), "utf8"));
    assert.equal(code.repository.sourceType, "local");
    assert.ok(code.entities.some((item) => item.name === "get"));
    assert.ok(code.relations.some((item) => item.kind === "direct_call"));
    assert.ok(code.evidence.every((item) => !Object.hasOwn(item, "fileHash")));
    assert.ok(!Object.hasOwn(code.repository, "commit"));
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test("URL Code Intake retains a depth-one clone inside the generated project", { skip: !python && "Python is required" }, () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "mechanism-lens-code-clone-"));
  try {
    const origin = path.join(scratch, "origin"), project = path.join(scratch, "generated project");
    mkdirSync(origin, { recursive: true }); mkdirSync(path.join(project, "content"), { recursive: true });
    git(["init"], origin);
    writeFileSync(path.join(origin, "cache.py"), "def load():\n    return 1\n");
    git(["add", "cache.py"], origin); git(["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "first"], origin);
    writeFileSync(path.join(origin, "cache.py"), "def load():\n    return 2\n");
    git(["add", "cache.py"], origin); git(["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "second"], origin);
    const url = pathToFileURL(origin).href;
    const result = runPython(python, [url, project, "--question", "How is the value loaded?", "--title", "Clone"]);
    assert.equal(result.status, 0, result.stderr);
    const clone = path.join(project, "sources", "code", "repository");
    assert.ok(existsSync(path.join(clone, ".git", "shallow")));
    assert.equal(git(["rev-list", "--count", "HEAD"], clone), "1");
    assert.match(readFileSync(path.join(clone, "cache.py"), "utf8"), /return 2/);
    const code = JSON.parse(readFileSync(path.join(project, "content", "code-ir.json"), "utf8"));
    assert.equal(code.repository.location, url);
    assert.ok(!Object.hasOwn(code.repository, "commit"));
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});
