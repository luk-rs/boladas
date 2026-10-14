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

  // 1. Games Page
  console.log("⚽ Navigating to /games...");
  await page.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const gamesListPath = ".screenshots/games-list-item2.png";
  await page.screenshot({ path: gamesListPath, fullPage: true });
  copyFileSync(gamesListPath, join(ARTIFACTS_DIR, "games-list-item2.png"));
  console.log("📸 Games list screenshot captured!");

  // 2. Click "Em Direto" button on scheduled game
  console.log("▶️ Clicking Em Direto button...");
  const liveBtn = page.getByRole("button", { name: "Em Direto" }).first();
  await liveBtn.click();
  await page.waitForTimeout(1000);

  const initialModalPath = ".screenshots/live-match-modal-initial.png";
  await page.screenshot({ path: initialModalPath, fullPage: true });
  copyFileSync(initialModalPath, join(ARTIFACTS_DIR, "live-match-modal-initial.png"));
  console.log("📸 Live Match Modal Initial screenshot captured!");

  // 3. Start timer and register goals
  console.log("⏱️ Starting timer and adding goals...");
  const startTimerBtn = page.getByRole("button", { name: "▶️ Iniciar" });
  await startTimerBtn.click();
  await page.waitForTimeout(2000);

  const addShirtsGoal = page.getByTitle("Golo das camisolas!");
  await addShirtsGoal.click();
  await page.waitForTimeout(300);
  await addShirtsGoal.click();
  await page.waitForTimeout(300);

  const addColetesGoal = page.getByTitle("Golo dos coletes!");
  await addColetesGoal.click();
  await page.waitForTimeout(500);

  const inPlayModalPath = ".screenshots/live-match-modal-in-play.png";
  await page.screenshot({ path: inPlayModalPath, fullPage: true });
  copyFileSync(inPlayModalPath, join(ARTIFACTS_DIR, "live-match-modal-in-play.png"));
  console.log("📸 Live Match Modal In-Play screenshot captured!");

  await browser.close();
  console.log("🎉 Work Item 2 live pass completed successfully!");
}

run().catch((err) => {
  console.error("❌ Live pass failed:", err);
  process.exit(1);
});
