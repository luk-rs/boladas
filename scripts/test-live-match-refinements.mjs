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

  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  // TEST 1: Desktop Browser with App Shell (1280x800)
  console.log("🌐 1. Testing Desktop Browser (1280x800) - Frame 'ao alto'...");
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  desktopPage.on("dialog", async (d) => { await d.accept(); });
  await desktopPage.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  await desktopPage.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1000);

  const desktopPlayBtn = desktopPage.getByRole("button", { name: /Em Direto/i }).first();
  await desktopPlayBtn.click();
  await desktopPage.waitForTimeout(800);

  await desktopPage.screenshot({ path: ".screenshots/live-match-portrait-shell-desktop.png" });
  copyFileSync(".screenshots/live-match-portrait-shell-desktop.png", join(ARTIFACTS_DIR, "live-match-portrait-shell-desktop.png"));
  console.log("📸 Saved live-match-portrait-shell-desktop.png");
  await desktopPage.close();

  // TEST 2: Native Mobile Phone Portrait Viewport (390x844 - iPhone 14/15)
  console.log("📱 2. Testing Mobile Phone Viewport (390x844) - Native 'ao alto'...");
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobilePage.on("dialog", async (d) => { await d.accept(); });
  await mobilePage.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  await mobilePage.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);

  const mobilePlayBtn = mobilePage.getByRole("button", { name: /Em Direto/i }).first();
  await mobilePlayBtn.click();
  await mobilePage.waitForTimeout(800);

  // Take screenshot of mobile initial view
  await mobilePage.screenshot({ path: ".screenshots/live-match-mobile-phone-portrait.png" });
  copyFileSync(".screenshots/live-match-mobile-phone-portrait.png", join(ARTIFACTS_DIR, "live-match-mobile-phone-portrait.png"));
  console.log("📸 Saved live-match-mobile-phone-portrait.png");

  // Start match
  const startBtn = mobilePage.getByRole("button", { name: /▶️ Iniciar/i });
  await startBtn.click();
  await mobilePage.waitForTimeout(400);

  // Click + GOLO on Camisolas
  const shirtsGoalBtn = mobilePage.locator("button:has-text('＋ GOLO')").first();
  await shirtsGoalBtn.click();
  await mobilePage.waitForTimeout(400);

  // Take screenshot of selection mode on mobile
  await mobilePage.screenshot({ path: ".screenshots/live-match-mobile-goal-selection.png" });
  copyFileSync(".screenshots/live-match-mobile-goal-selection.png", join(ARTIFACTS_DIR, "live-match-mobile-goal-selection.png"));
  console.log("📸 Saved live-match-mobile-goal-selection.png");

  // Tap first player on Camisolas (Tiago Gestor)
  const pickScorerBtn = mobilePage.locator("div.fixed.z-\\[150\\] button:has-text('Tiago Gestor')");
  await pickScorerBtn.click();
  await mobilePage.waitForTimeout(400);

  // Click + GOLO on Coletes
  const coletesGoalBtn = mobilePage.getByTitle("Golo dos Coletes! (Selecionar marcador)");
  await coletesGoalBtn.click();
  await mobilePage.waitForTimeout(400);

  // Tap Autogolo (AG) on Camisolas player (André Horta)
  const autogoloBtn = mobilePage.locator("div.fixed.z-\\[150\\] button:has-text('André Horta')");
  await autogoloBtn.click();
  await mobilePage.waitForTimeout(400);

  // Take screenshot after both goals
  await mobilePage.screenshot({ path: ".screenshots/live-match-mobile-with-goals.png" });
  copyFileSync(".screenshots/live-match-mobile-with-goals.png", join(ARTIFACTS_DIR, "live-match-mobile-with-goals.png"));
  console.log("📸 Saved live-match-mobile-with-goals.png");

  await mobilePage.close();
  await browser.close();
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

run().catch((e) => {
  console.error("❌ Test error:", e);
  process.exit(1);
});
