declare function require(moduleName: string): any;
declare const process: {
  cwd: () => string;
  exit: (code: number) => never;
  stderr: { write: (text: string) => unknown };
  stdout: { write: (text: string) => unknown };
};

const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");

const APP_ROOT = process.cwd();
const SRC_ROOT = join(APP_ROOT, "src");

const violations: string[] = [];

function walk(dir: string, acc: string[] = []) {
  const entries = readdirSync(dir) as string[];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }

    if (!fullPath.endsWith(".ts") && !fullPath.endsWith(".tsx")) {
      continue;
    }
    if (fullPath.endsWith(".d.ts")) {
      continue;
    }

    acc.push(fullPath);
  }

  return acc;
}

function addViolation(filePath: string, message: string) {
  violations.push(`${relative(APP_ROOT, filePath)}: ${message}`);
}

const allFiles = walk(SRC_ROOT);

for (const filePath of allFiles) {
  const normalized = filePath.replaceAll("\\", "/");
  const content = readFileSync(filePath, "utf8") as string;

  if (normalized.includes("/features/teams/dashboard/")) {
    addViolation(filePath, "legacy dashboard folder is not allowed");
  }

  if (/from\s+["'][^"']*features\/teams\/dashboard[^"']*["']/.test(content)) {
    addViolation(filePath, "imports from features/teams/dashboard are not allowed");
  }

  const isPageOrComponent =
    normalized.includes("/features/") &&
    (normalized.includes("/pages/") || normalized.includes("/components/"));

  if (isPageOrComponent) {
    if (/from\s+["'][^"']*supabase[^"']*["']/.test(content)) {
      addViolation(
        filePath,
        "pages/components cannot import Supabase modules directly",
      );
    }

    if (/\bsupabase\s*\./.test(content)) {
      addViolation(
        filePath,
        "pages/components cannot access supabase client directly",
      );
    }
  }

  const isServiceFile = normalized.includes("/services/");
  const isSharedApiFile = normalized.includes("/shared/api/");

  if (!isServiceFile) {
    if (/from\s+["'][^"']*\/lib\/supabase["']/.test(content)) {
      addViolation(
        filePath,
        "imports from src/lib/supabase are only allowed in service files",
      );
    }
  }

  if (!isServiceFile && !isSharedApiFile) {
    if (/\bsupabase\s*\.\s*(rpc|from)\s*\(/.test(content)) {
      addViolation(
        filePath,
        "supabase.rpc/supabase.from are only allowed in service files",
      );
    }
  }
}

if (violations.length > 0) {
  process.stderr.write("Architecture check failed:\n\n");
  for (const violation of violations) {
    process.stderr.write(`- ${violation}\n`);
  }
  process.exit(1);
}

process.stdout.write("Architecture check passed.\n");
