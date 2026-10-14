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
  console.log(`✅ Logged in successfully as user ${session.user.id} (${session.user.email})`);

  console.log("🌐 Launching Playwright browser...");
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 440, height: 900 },
  });

  const page = await context.newPage();

  // Pre-seed localStorage with the real session on http://localhost:5173
  await page.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  // 1. Live pass: Standings Page
  console.log("🏆 Navigating to /standings...");
  await page.goto("http://localhost:5173/standings", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const standingsPath = ".screenshots/standings-live-real.png";
  await page.screenshot({ path: standingsPath, fullPage: true });
  copyFileSync(standingsPath, join(ARTIFACTS_DIR, "standings-live-real.png"));
  console.log("📸 Standings screenshot captured!");

  // 2. Live pass: Profile Page
  console.log("👤 Navigating to /profile...");
  await page.goto("http://localhost:5173/profile", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const profilePath = ".screenshots/profile-live-real.png";
  await page.screenshot({ path: profilePath, fullPage: true });
  copyFileSync(profilePath, join(ARTIFACTS_DIR, "profile-live-real.png"));
  console.log("📸 Profile screenshot captured!");

  // 3. Live pass: Team Settings Page
  console.log("⚙️ Navigating to /teams...");
  await page.goto("http://localhost:5173/teams", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const teamsPath = ".screenshots/team-settings-live-real.png";
  await page.screenshot({ path: teamsPath, fullPage: true });
  copyFileSync(teamsPath, join(ARTIFACTS_DIR, "team-settings-live-real.png"));
  console.log("📸 Team Settings screenshot captured!");

  await browser.close();
  console.log("🎉 Full live pass completed successfully!");
}

run().catch((err) => {
  console.error("❌ Live pass failed:", err);
  process.exit(1);
});
