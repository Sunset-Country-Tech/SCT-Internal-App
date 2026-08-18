import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["prisma", "generate"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
