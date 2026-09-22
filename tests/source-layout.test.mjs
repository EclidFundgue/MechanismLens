import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scripts = fileURLToPath(new URL("../skills/mechanism-lens/scripts/", import.meta.url));
const bash = process.env.BASH_EXECUTABLE || (process.platform === "win32" ? null : "bash");
const shellPath = (value) => value.replaceAll("\\", "/");

test("downloads stay inside the initialized project across cwd changes and preserve originals", {
  skip: !bash && "Set BASH_EXECUTABLE to Git Bash on Windows",
}, () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "paper-layout-"));
  try {
    const root = path.join(scratch, "论文 project");
    const elsewhere = path.join(scratch, "other cwd");
    mkdirSync(path.join(elsewhere, "bin"), { recursive: true });
    const scaffold = spawnSync(process.execPath, [path.join(scripts, "scaffold-project.mjs"), root], { encoding: "utf8" });
    assert.equal(scaffold.status, 0, scaffold.stderr);
    assert.ok(existsSync(path.join(root, "sources")));

    // Fake only the network transfer; run the real downloader and extraction path.
    const original = "\\documentclass{article}\nLocal fixture\n";
    writeFileSync(path.join(elsewhere, "fixture.tex"), original);
    writeFileSync(path.join(elsewhere, "bin", "curl"), `#!/usr/bin/env bash
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "-o" ]]; then cp "$PWD/fixture.tex" "$2"; exit; fi
  shift
done
exit 1
`, { mode: 0o755 });
    const fetch = (...args) => spawnSync(bash, ["-c", 'export PATH="$PWD/bin:$PATH"; exec bash "$@"', "test-fetch",
      shellPath(path.join(scripts, "fetch-arxiv.sh")), ...args.map(shellPath)], { cwd: elsewhere, encoding: "utf8" });

    assert.equal(fetch("1706.03762").status, 2);
    assert.equal(fetch("1706.03762", elsewhere).status, 2);
    assert.ok(!existsSync(path.join(elsewhere, "paper-src")));
    assert.ok(!existsSync(path.join(elsewhere, "sources")));
    const result = fetch("1706.03762", root);
    assert.equal(result.status, 0, result.stderr);
    const archive = path.join(root, "sources", "arxiv", "source.tar.gz");
    assert.equal(readFileSync(archive, "utf8"), original);
    assert.equal(readFileSync(path.join(root, "sources", "arxiv", "src", "main.tex"), "utf8"), original);
    writeFileSync(path.join(elsewhere, "fixture.tex"), "replacement");
    assert.equal(fetch("1706.03762", root).status, 2);
    assert.equal(readFileSync(archive, "utf8"), original);
    assert.ok(!existsSync(path.join(elsewhere, "paper-src")));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
