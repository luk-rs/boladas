import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });

try {
  await run("node", [path.join(rootDir, "scripts", "setup-dev.mjs")]);
  await run("docker", ["compose", "-f", path.join(rootDir, "docker-compose.yml"), "up", "-d"]);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const api = spawn("pnpm", ["dev:api"], { cwd: rootDir, stdio: "inherit" });
const app = spawn("pnpm", ["dev:app"], { cwd: rootDir, stdio: "inherit" });

let exiting = false;
const shutdown = (code = 0) => {
  if (exiting) return;
  exiting = true;
  api.kill("SIGINT");
  app.kill("SIGINT");
  process.exit(code);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

api.on("exit", (code) => shutdown(code ?? 0));
app.on("exit", (code) => shutdown(code ?? 0));
