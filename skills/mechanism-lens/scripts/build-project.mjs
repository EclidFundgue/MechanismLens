#!/usr/bin/env node

import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

function usage() {
  console.log("Usage: node build-project.mjs <generated-project-dir>");
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  usage();
  process.exit(0);
}

const root = path.resolve(process.cwd(), args[0]);
const projectDir = path.join(root, "project");
const npm = "npm";

await access(path.join(projectDir, "package.json"));

function run(command, commandArgs, cwd) {
  return new Promise((resolve, reject) => {
    // Windows executes npm through npm.cmd, which requires cmd.exe. Keep shell
    // mode disabled and invoke the command processor explicitly so paths remain
    // data rather than interpolated command text.
    const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : command;
    const args = process.platform === "win32" ? ["/d", "/s", "/c", command, ...commandArgs] : commandArgs;
    const child = spawn(executable, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(" ")} exited with ${code}`));
    });
  });
}

try {
  await access(path.join(projectDir, "node_modules"));
} catch {
  await run(npm, ["install"], projectDir);
}

await run(npm, ["run", "build"], projectDir);
console.log(`Built: ${path.join(root, "site")}`);
console.log("Open with open.cmd / open.command / open.sh.");
