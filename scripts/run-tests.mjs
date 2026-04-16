import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const testsRoot = path.join(root, "tests");

function collectTestFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTestFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".test.ts") ? [fullPath] : [];
  });
}

const testFiles = collectTestFiles(testsRoot);
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...testFiles], {
  cwd: root,
  stdio: "inherit"
});

process.exit(result.status ?? 1);