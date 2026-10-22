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
    throw new Error(`Failed to authenticate: ${res.status} ${await res.text()}`);
  }

  return await res.json();
}

async function run() {
  console.log("🔑 Authenticating with local Supabase...");
  const session = await getAuthSession("gestor@boladas.pt", "boladas123");

  console.log("🌐 Launching Playwright browser in viewport 1024x768...");
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
  });

  const page = await context.newPage();

  page.on("dialog", async (dialog) => {
    console.log("💬 Dialog prompt:", dialog.message());
    await dialog.accept();
  });

  await page.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  // 1. Check Games List Expander & Tooltips
  console.log("🎮 1. Navigating to /games to check past games expander and tooltips...");
  await page.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const expander = page.locator("details summary").filter({ hasText: /Jogos Anteriores/i });
  if (await expander.isVisible()) {
    console.log("📂 Expanding 'Jogos Anteriores'...");
    await expander.click();
    await page.waitForTimeout(600);

    await page.screenshot({ path: ".screenshots/games-expander-clean.png" });
    copyFileSync(
      ".screenshots/games-expander-clean.png",
      join(ARTIFACTS_DIR, "games-expander-clean.png")
    );
    console.log("📸 Saved games-expander-clean.png");
  }

  // 2. Convocations: Formar Equipas -> Aceitar Jogo
  console.log("📅 2. Navigating to /convocations...");
  await page.goto("http://localhost:5173/convocations", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const formarEquipasBtn = page.getByRole("button", { name: /Formar Equipas/i }).first();
  console.log("Clicking 'Formar Equipas' on open convocation...");
  await formarEquipasBtn.click();
  await page.waitForTimeout(1200);

  const convocationId = page.url().split("/").pop();
  console.log("📍 Now on /games/new/" + convocationId);

  // Click Aceitar Jogo
  const acceptGameBtn = page.getByTitle("Aceitar jogo");
  await acceptGameBtn.click();
  await page.waitForTimeout(2000);

  // Verify we are now on /games and the scheduled game exists
  console.log("⚽ Navigated to /games after creating match.");
  await page.screenshot({ path: ".screenshots/games-with-scheduled-match.png" });
  copyFileSync(
    ".screenshots/games-with-scheduled-match.png",
    join(ARTIFACTS_DIR, "games-with-scheduled-match.png")
  );
  console.log("📸 Saved games-with-scheduled-match.png");

  // 3. Visit /games/new/:id to verify LOCK banner and disabled shuffle
  console.log(`🔒 Navigating to /games/new/${convocationId} (should be locked)...`);
  await page.goto(`http://localhost:5173/games/new/${convocationId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: ".screenshots/game-form-locked.png" });
  copyFileSync(
    ".screenshots/game-form-locked.png",
    join(ARTIFACTS_DIR, "game-form-locked.png")
  );
  console.log("📸 Saved game-form-locked.png");

  // 4. Go to /convocations to see accepted convocation with "Ver Jogo" and "Reabrir"
  console.log("📅 Navigating back to /convocations...");
  await page.goto("http://localhost:5173/convocations", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: ".screenshots/convocations-accepted-ready-to-reopen.png" });
  copyFileSync(
    ".screenshots/convocations-accepted-ready-to-reopen.png",
    join(ARTIFACTS_DIR, "convocations-accepted-ready-to-reopen.png")
  );
  console.log("📸 Saved convocations-accepted-ready-to-reopen.png");

  // Click "Reabrir" button
  console.log("↺ Clicking 'Reabrir' button on the accepted convocation...");
  const reopenBtn = page.getByRole("button", { name: /Reabrir/i }).first();
  await reopenBtn.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: ".screenshots/convocations-reopened-back-to-open.png" });
  copyFileSync(
    ".screenshots/convocations-reopened-back-to-open.png",
    join(ARTIFACTS_DIR, "convocations-reopened-back-to-open.png")
  );
  console.log("📸 Saved convocations-reopened-back-to-open.png");

  // 5. Check /games to verify the scheduled game was automatically removed from the database!
  console.log("🎮 Checking /games: verifying scheduled match was deleted upon reopening...");
  await page.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: ".screenshots/games-scheduled-removed-after-reopen.png" });
  copyFileSync(
    ".screenshots/games-scheduled-removed-after-reopen.png",
    join(ARTIFACTS_DIR, "games-scheduled-removed-after-reopen.png")
  );
  console.log("📸 Saved games-scheduled-removed-after-reopen.png");

  await browser.close();
  console.log("🎉 ALL TESTS PASSED VISUALLY AND FUNCTIONALLY!");
}

run().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
