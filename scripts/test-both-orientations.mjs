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

  // 1. Desktop Shell (1280x800) - Wide Landscape Scoreboard Active
  console.log("🖥️ 1. Testing Desktop Browser (1280x800) with Landscape Scoreboard active...");
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

  await desktopPage.screenshot({ path: ".screenshots/live-match-landscape-scoreboard-desktop.png" });
  copyFileSync(".screenshots/live-match-landscape-scoreboard-desktop.png", join(ARTIFACTS_DIR, "live-match-landscape-scoreboard-desktop.png"));
  console.log("📸 Saved live-match-landscape-scoreboard-desktop.png");

  // 2. Mobile Phone Rotated Sideways (Landscape: 844x390 - iPhone 14/15 sideways)
  console.log("📱 2. Testing Mobile Phone Rotated Sideways (844x390)...");
  const phoneLandscapePage = await browser.newPage({ viewport: { width: 844, height: 390 } });
  phoneLandscapePage.on("dialog", async (d) => { await d.accept(); });
  await phoneLandscapePage.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  await phoneLandscapePage.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await phoneLandscapePage.waitForTimeout(1000);

  const phoneLandscapePlayBtn = phoneLandscapePage.getByRole("button", { name: /Em Direto/i }).first();
  await phoneLandscapePlayBtn.click();
  await phoneLandscapePage.waitForTimeout(800);

  await phoneLandscapePage.screenshot({ path: ".screenshots/live-match-landscape-phone-rotated.png" });
  copyFileSync(".screenshots/live-match-landscape-phone-rotated.png", join(ARTIFACTS_DIR, "live-match-landscape-phone-rotated.png"));
  console.log("📸 Saved live-match-landscape-phone-rotated.png");

  // 3. Mobile Phone Held Upright (Portrait: 390x844 - iPhone 14/15 upright)
  console.log("📱 3. Testing Mobile Phone Held Upright (390x844)...");
  const phonePortraitPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  phonePortraitPage.on("dialog", async (d) => { await d.accept(); });
  await phonePortraitPage.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  await phonePortraitPage.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await phonePortraitPage.waitForTimeout(1000);

  const phonePortraitPlayBtn = phonePortraitPage.getByRole("button", { name: /Em Direto/i }).first();
  await phonePortraitPlayBtn.click();
  await phonePortraitPage.waitForTimeout(800);

  await phonePortraitPage.screenshot({ path: ".screenshots/live-match-portrait-phone-upright.png" });
  copyFileSync(".screenshots/live-match-portrait-phone-upright.png", join(ARTIFACTS_DIR, "live-match-portrait-phone-upright.png"));
  console.log("📸 Saved live-match-portrait-phone-upright.png");

  await browser.close();
  console.log("🎉 ALL SCREENSHOTS SAVED SUCCESSFULLY!");
}

run().catch((e) => {
  console.error("❌ Test error:", e);
  process.exit(1);
});
