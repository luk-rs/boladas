import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const ARTIFACTS_DIR =
  "/Users/luk/.gemini/antigravity/brain/69702123-de04-4452-b1c9-375eb0233edd";

mkdirSync(".screenshots", { recursive: true });

async function getAuthSession(email, password) {
  const res = await fetch("http://localhost:54321/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Failed to authenticate with Supabase: ${res.status} ${await res.text()}`);
  }

  return await res.json();
}

async function run() {
  console.log("🔑 Authenticating with local Supabase as gestor@boladas.pt...");
  const session = await getAuthSession("gestor@boladas.pt", "boladas123");
  console.log(`✅ Logged in successfully as user ${session.user.id}`);

  console.log("🌐 Launching Playwright browser...");
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 440, height: 900 },
  });

  const page = await context.newPage();

  await page.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  // 1. Convocations Page
  console.log("📋 Navigating to /convocations...");
  await page.goto("http://localhost:5173/convocations", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const convocationsPath = ".screenshots/convocations-live-item1.png";
  await page.screenshot({ path: convocationsPath, fullPage: true });
  copyFileSync(convocationsPath, join(ARTIFACTS_DIR, "convocations-live-item1.png"));
  console.log("📸 Convocations screenshot captured!");

  // 2. Game Form Page
  console.log("🎲 Navigating to /games/new/c1111111-1111-1111-1111-111111111111...");
  await page.goto("http://localhost:5173/games/new/c1111111-1111-1111-1111-111111111111", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const beforeShufflePath = ".screenshots/game-form-before-shuffle.png";
  await page.screenshot({ path: beforeShufflePath, fullPage: true });
  copyFileSync(beforeShufflePath, join(ARTIFACTS_DIR, "game-form-before-shuffle.png"));
  console.log("📸 Game form before shuffle screenshot captured!");

  // 3. Click Shuffle button
  console.log("🎲 Clicking Sortear button...");
  const shuffleBtn = page.getByRole("button", { name: "Sortear" });
  await shuffleBtn.click();
  await page.waitForTimeout(500);

  const afterShufflePath = ".screenshots/game-form-after-shuffle.png";
  await page.screenshot({ path: afterShufflePath, fullPage: true });
  copyFileSync(afterShufflePath, join(ARTIFACTS_DIR, "game-form-after-shuffle.png"));
  console.log("📸 Game form after shuffle screenshot captured!");

  await browser.close();
  console.log("🎉 Work Item 1 live pass completed successfully!");
}

run().catch((err) => {
  console.error("❌ Live pass failed:", err);
  process.exit(1);
});
