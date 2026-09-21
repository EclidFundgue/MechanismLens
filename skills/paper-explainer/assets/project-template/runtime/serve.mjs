#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const root = path.resolve(process.cwd(), args.find((arg) => !arg.startsWith("--")) ?? "site");
const shouldOpen = args.includes("--open");
const requestedPort = Number(args.find((arg) => arg.startsWith("--port="))?.split("=")[1] ?? 0);

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".pdf", "application/pdf"],
  [".woff2", "font/woff2"],
]);

await access(path.join(root, "index.html"));

function openBrowser(url) {
  const spec = process.platform === "win32"
    ? ["cmd", ["/c", "start", "", url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : ["xdg-open", [url]];
  const child = spawn(spec[0], spec[1], { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", (error) => {
    console.warn(`Could not open the browser automatically: ${error.message}`);
  });
  child.unref();
}

function safeFilePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative || "index.html");
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  return candidate;
}

const server = createServer(async (request, response) => {
  let filePath = safeFilePath(request.url ?? "/");
  if (!filePath) {
    response.writeHead(400).end("Bad request");
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, "index.html");
    await access(filePath);
  } catch {
    filePath = path.join(root, "index.html");
  }

  response.setHeader("Content-Type", mime.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream");
  response.setHeader("Cache-Control", "no-cache");
  createReadStream(filePath)
    .on("error", () => response.writeHead(500).end("Failed to read file"))
    .pipe(response);
});

server.listen(Number.isFinite(requestedPort) ? requestedPort : 0, "127.0.0.1", () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  const url = `http://127.0.0.1:${port}/`;
  console.log(`Paper Explainer: ${url}`);
  console.log("Press Ctrl+C to stop.");
  if (shouldOpen) openBrowser(url);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
