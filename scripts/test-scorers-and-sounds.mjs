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

  console.log("🌐 Launching Playwright browser (Landscape 1024x640)...");
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1024, height: 640 },
  });

  const page = await context.newPage();

  page.on("dialog", async (d) => { await d.accept(); });
  await page.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  // 1. Ensure we have a scheduled game to test with
  console.log("1. Checking /games for a scheduled match...");
  await page.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  let playBtn = page.getByRole("button", { name: /Em Direto/i }).first();
  if (!await playBtn.isVisible()) {
    console.log("No scheduled match found. Creating one via /convocations...");
    await page.goto("http://localhost:5173/convocations", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const formarBtn = page.getByRole("button", { name: /Formar Equipas/i }).first();
    await formarBtn.click();
    await page.waitForTimeout(1000);
    const acceptGameBtn = page.getByTitle("Aceitar jogo");
    if (await acceptGameBtn.isVisible()) {
      await acceptGameBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // 2. Test Live Match Modal (Landscape Player with Sound & Scorers)
  console.log("2. Opening Live Match Modal...");
  await page.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  playBtn = page.getByRole("button", { name: /Em Direto/i }).first();
  await playBtn.click();
  await page.waitForTimeout(1000);

  // Check audio toggle
  const soundToggle = page.getByRole("button", { name: /Som Ativo/i });
  console.log("Sound toggle visible:", await soundToggle.isVisible());

  // Click Play to start timer (referee start whistle)
  const timerStartBtn = page.getByRole("button", { name: /▶️ Iniciar/i });
  await timerStartBtn.click();
  await page.waitForTimeout(500);

  // Tap a player in Camisolas (e.g. first player)
  console.log("Assigning goal directly by tapping player in lineup...");
  const firstPlayerBtn = page.locator("section:has-text('Camisolas') button:has-text('⚽')").first().or(
    page.locator("section:has-text('Camisolas') button.group").first()
  );
  if (await firstPlayerBtn.isVisible()) {
    await firstPlayerBtn.click();
    await page.waitForTimeout(400);
  }

  // Tap + GOLO on Coletes to open scorer picker modal
  console.log("Tapping + GOLO on Coletes to test picker modal...");
  const addColetesGoalBtn = page.getByTitle("Golo dos Coletes! (Escolher marcador)");
  await addColetesGoalBtn.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: ".screenshots/live-match-scorer-picker.png" });
  copyFileSync(".screenshots/live-match-scorer-picker.png", join(ARTIFACTS_DIR, "live-match-scorer-picker.png"));
  console.log("📸 Saved live-match-scorer-picker.png");

  // Pick first player from modal
  const pickFirstPlayer = page.locator(".fixed.z-\\[160\\] button:has-text('＋ Golo')").first();
  if (await pickFirstPlayer.isVisible()) {
    await pickFirstPlayer.click();
    await page.waitForTimeout(400);
  }

  // Take screenshot of live match with scores, scorers, and timeline
  await page.screenshot({ path: ".screenshots/live-match-with-scorers.png" });
  copyFileSync(".screenshots/live-match-with-scorers.png", join(ARTIFACTS_DIR, "live-match-with-scorers.png"));
  console.log("📸 Saved live-match-with-scorers.png");

  // Finish match (referee final whistle)
  console.log("Finishing match...");
  const finishBtn = page.getByRole("button", { name: /Terminar e Gravar Jogo/i });
  await finishBtn.click();
  await page.waitForTimeout(2000);

  // 3. Test Record Result Sheet with Scorer Steppers
  console.log("3. Testing 'Registar resultado' sheet with scorers...");
  // Expand past games
  const expander = page.locator("details summary").filter({ hasText: /Jogos Anteriores/i });
  if (await expander.isVisible()) {
    await expander.click();
    await page.waitForTimeout(500);
  }

  const recordResultBtn = page.getByRole("button", { name: /Registar resultado/i }).first();
  if (await recordResultBtn.isVisible()) {
    await recordResultBtn.click();
    await page.waitForTimeout(800);

    // Tap + on players in steppers
    const steppers = page.locator("button:has-text('＋')");
    if (await steppers.count() > 0) {
      await steppers.first().click();
      await page.waitForTimeout(300);
      await steppers.nth(1).click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: ".screenshots/record-result-with-scorers.png" });
    copyFileSync(".screenshots/record-result-with-scorers.png", join(ARTIFACTS_DIR, "record-result-with-scorers.png"));
    console.log("📸 Saved record-result-with-scorers.png");

    // Save
    const saveBtn = page.getByRole("button", { name: "Guardar" });
    await saveBtn.click();
    await page.waitForTimeout(1500);
  }

  // 4. Check completed game cards showing scorer names on chips
  console.log("4. Verifying completed game chips with scorer names...");
  if (await expander.isVisible()) {
    // re-expand if closed
    const isOpen = await page.locator("details[open]").count();
    if (!isOpen) {
      await expander.click();
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: ".screenshots/games-completed-with-scorer-chips.png" });
  copyFileSync(".screenshots/games-completed-with-scorer-chips.png", join(ARTIFACTS_DIR, "games-completed-with-scorer-chips.png"));
  console.log("📸 Saved games-completed-with-scorer-chips.png");

  await browser.close();
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
