import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync } from "node:fs";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const scaffold = join(repositoryRoot, "skills/mechanism-lens/scripts/scaffold-project.mjs");
const build = join(repositoryRoot, "skills/mechanism-lens/scripts/build-project.mjs");

function terminateTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
  else child.kill("SIGKILL");
}

function run(command, args, cwd) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    const timer = setTimeout(() => {
      timedOut = true;
      terminateTree(child);
    }, 180_000);
    child.once("close", (code) => {
      clearTimeout(timer);
      const invocation = `${command} ${args.join(" ")}\n${stdout}\n${stderr}`;
      if (timedOut) reject(new Error(`command timed out\n${invocation}`));
      else if (code !== 0) reject(new Error(`command exited with ${code}\n${invocation}`));
      else resolveRun({ stdout, stderr });
    });
  });
}

function request(url) {
  return new Promise((resolveRequest, reject) => {
    get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolveRequest({ status: response.statusCode, body }));
    }).on("error", reject);
  });
}

async function startServer(root) {
  const child = spawn(process.execPath, [join(root, "runtime/serve.mjs"), join(root, "site"), "--port=0"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = await new Promise((resolveUrl, reject) => {
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`server start timed out: ${stderr}`)), 15_000);
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdout.on("data", (chunk) => {
      const match = String(chunk).match(/MechanismLens: (http:\/\/127\.0\.0\.1:\d+\/)/);
      if (match) {
        clearTimeout(timer);
        resolveUrl(match[1]);
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`server exited with ${code}: ${stderr}`));
    });
  });
  return { child, url };
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 2_000)),
  ]);
  if (child.exitCode === null) terminateTree(child);
}

async function removeTemporaryRoot(root) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      rmSync(root, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
  }
  throw lastError;
}

test("scaffolded delivery validates, builds, and serves outside the repository", { timeout: 240_000 }, async () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "mechanism-lens-delivery-"));
  const staging = join(temporaryRoot, "staging");
  const delivered = join(temporaryRoot, "论文 讲解 交付");
  let server;
  try {
    await run(process.execPath, [scaffold, staging, "--title", "Delivery fixture"], repositoryRoot);
    renameSync(staging, delivered);

    const generatedValidator = join(delivered, "runtime/validate-data.mjs");
    assert.equal(existsSync(join(delivered, "engine/compiler/index.mjs")), true);
    assert.equal(existsSync(join(delivered, "engine/validation/index.mjs")), true);
    assert.equal(existsSync(join(delivered, "content/visual-intent.json")), true);
    await run(process.execPath, [generatedValidator, join(delivered, "content")], delivered);
    await run(process.execPath, [build, delivered], repositoryRoot);

    assert.equal(existsSync(join(delivered, "site/index.html")), true);
    for (const launcher of ["open.cmd", "open.command", "open.sh"]) assert.equal(existsSync(join(delivered, launcher)), true, launcher);

    server = await startServer(delivered);
    const page = await request(server.url);
    assert.equal(page.status, 200);
    assert.match(page.body, /<div id="root"><\/div>/);

    const html = readFileSync(join(delivered, "site/index.html"), "utf8");
    const asset = html.match(/(?:src|href)="(\.\/assets\/[^"]+)"/)?.[1];
    assert.ok(asset, "built page should reference a relative asset");
    const builtAsset = await request(new URL(asset, server.url));
    assert.equal(builtAsset.status, 200);
    assert.ok(builtAsset.body.length > 0);
  } finally {
    await stopServer(server?.child);
    await removeTemporaryRoot(temporaryRoot);
  }
});
