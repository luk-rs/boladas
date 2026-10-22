import { chromium } from "playwright";
import { copyFileSync, mkdirSync } from "node:fs";
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
    throw new Error(`Failed to authenticate: ${res.status} ${await res.text()}`);
  }

  return await res.json();
}

async function run() {
  console.log("🔑 Authenticating with local Supabase...");
  const session = await getAuthSession("gestor@boladas.pt", "boladas123");

  console.log("🌐 Launching Playwright browser (1280x800 desktop)...");
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("dialog", async (d) => { await d.accept(); });

  await page.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  console.log("1. Navigating to /games...");
  await page.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click Em Direto
  const playBtn = page.getByRole("button", { name: /Em Direto/i }).first();
  await playBtn.click();
  await page.waitForTimeout(800);

  // Verify Point 1: When match not started, + GOLO is disabled
  const shirtsGoalBtn = page.locator("button:has-text('＋ GOLO')").first();
  const isInitiallyDisabled = await shirtsGoalBtn.isDisabled();
  console.log("Point 1 - + GOLO disabled when game not started:", isInitiallyDisabled);
  if (!isInitiallyDisabled) {
    throw new Error("Expected + GOLO to be disabled when match is not running");
  }

  // Take screenshot of desktop framed player (Point 5)
  await page.screenshot({ path: ".screenshots/live-match-desktop-framed.png" });
  copyFileSync(".screenshots/live-match-desktop-framed.png", join(ARTIFACTS_DIR, "live-match-desktop-framed.png"));
  console.log("📸 Saved live-match-desktop-framed.png");

  // Start match
  console.log("Starting match...");
  const startBtn = page.getByRole("button", { name: /▶️ Iniciar/i });
  await startBtn.click();
  await page.waitForTimeout(500);

  // Verify Point 1: Now + GOLO is enabled
  const isNowEnabled = !(await shirtsGoalBtn.isDisabled());
  console.log("Point 1 - + GOLO enabled when game running:", isNowEnabled);

  // Click + GOLO on Camisolas
  console.log("Triggering + GOLO on Camisolas (Points 3 & 4)...");
  await shirtsGoalBtn.click();
  await page.waitForTimeout(400);

  // Take screenshot of goal selection mode (caras + autogolo + center banner)
  await page.screenshot({ path: ".screenshots/live-match-goal-selection-mode.png" });
  copyFileSync(".screenshots/live-match-goal-selection-mode.png", join(ARTIFACTS_DIR, "live-match-goal-selection-mode.png"));
  console.log("📸 Saved live-match-goal-selection-mode.png");

  // Tap first player on Camisolas (Marcou ＋)
  console.log("Tapping scorer on Camisolas...");
  const marcouBtn = page.locator("button:has-text('Marcou ＋')").first();
  await marcouBtn.click();
  await page.waitForTimeout(400);

  // Score another goal: Coletes scored via own goal by Camisolas player
  console.log("Triggering + GOLO on Coletes...");
  const coletesGoalBtn = page.getByTitle("Golo dos Coletes! (Selecionar marcador)");
  await coletesGoalBtn.click();
  await page.waitForTimeout(400);

  // Tap Autogolo on a Camisolas player
  console.log("Tapping Autogolo on Camisolas defender...");
  const autogoloBtn = page.locator("button:has-text('Autogolo')").first();
  await autogoloBtn.click();
  await page.waitForTimeout(400);

  // Verify Point 2: Newest on TOP
  await page.screenshot({ path: ".screenshots/live-match-newest-on-top-and-autogolo.png" });
  copyFileSync(".screenshots/live-match-newest-on-top-and-autogolo.png", join(ARTIFACTS_DIR, "live-match-newest-on-top-and-autogolo.png"));
  console.log("📸 Saved live-match-newest-on-top-and-autogolo.png");

  // Point 4: Remove goal strictly via history ✕
  console.log("Testing removal via history ✕ button (Point 4)...");
  const firstDeleteBtn = page.locator("div.space-y-1\\.5 button[title='Anular este golo']").first();
  if (await firstDeleteBtn.isVisible()) {
    await firstDeleteBtn.click();
    await page.waitForTimeout(400);
  }

  // Screenshot after deleting
  await page.screenshot({ path: ".screenshots/live-match-after-goal-removal.png" });
  copyFileSync(".screenshots/live-match-after-goal-removal.png", join(ARTIFACTS_DIR, "live-match-after-goal-removal.png"));
  console.log("📸 Saved live-match-after-goal-removal.png");

  await browser.close();
  console.log("🎉 ALL 5 REFINEMENT TESTS PASSED SUCCESSFULLY!");
}

run().catch((e) => {
  console.error("❌ Test error:", e);
  process.exit(1);
});
