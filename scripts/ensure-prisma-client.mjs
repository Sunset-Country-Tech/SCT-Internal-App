import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const clientEntry = join(process.cwd(), "node_modules", ".prisma", "client", "index.js");

if (existsSync(clientEntry)) {
  process.exit(0);
}

const result = spawnSync("npx", ["prisma", "generate"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
