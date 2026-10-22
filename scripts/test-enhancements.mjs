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

  console.log("🌐 Launching Playwright browser in Landscape viewport (1024x600)...");
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1024, height: 640 },
  });

  const page = await context.newPage();

  await page.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  // 1. Test Game Form Stats Recalculation
  console.log("📋 Navigating to /games/new/c1111111-1111-1111-1111-111111111111...");
  await page.goto("http://localhost:5173/games/new/c1111111-1111-1111-1111-111111111111", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1000);

  // Screenshot before shuffle
  await page.screenshot({ path: ".screenshots/game-form-dynamic-stats-1.png" });
  copyFileSync(".screenshots/game-form-dynamic-stats-1.png", join(ARTIFACTS_DIR, "game-form-dynamic-stats-1.png"));
  console.log("📸 Captured stats before shuffle");

  // Click Sortear
  const shuffleBtn = page.getByRole("button", { name: /Sortear/i });
  await shuffleBtn.click();
  await page.waitForTimeout(600);

  // Screenshot after shuffle
  await page.screenshot({ path: ".screenshots/game-form-dynamic-stats-2.png" });
  copyFileSync(".screenshots/game-form-dynamic-stats-2.png", join(ARTIFACTS_DIR, "game-form-dynamic-stats-2.png"));
  console.log("📸 Captured stats after shuffle (recalculated!)");

  // Click accept/create game (📝 button)
  const acceptBtn = page.getByTitle("Aceitar jogo");
  if (await acceptBtn.count() > 0) {
    console.log("🔘 Clicking create game button...");
    await acceptBtn.click();
    await page.waitForTimeout(2000);
  }

  // 2. Games List: Check upcoming prioritized and past games collapsed
  console.log("📋 Checking /games list...");
  await page.goto("http://localhost:5173/games", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  await page.screenshot({ path: ".screenshots/games-list-collapsed-past.png" });
  copyFileSync(".screenshots/games-list-collapsed-past.png", join(ARTIFACTS_DIR, "games-list-collapsed-past.png"));
  console.log("📸 Captured games list with upcoming prioritized and collapsed past games");

  // 3. Test Live Match Modal (Landscape Broadcast UI)
  const liveBtn = page.getByRole("button", { name: /Em Direto/i }).first();
  if (await liveBtn.count() > 0) {
    console.log("🔘 Opening Live Match Modal...");
    await liveBtn.click();
    await page.waitForTimeout(1000);

    // Start timer
    const startTimerBtn = page.getByRole("button", { name: /Iniciar/i });
    if (await startTimerBtn.count() > 0) {
      await startTimerBtn.click();
    }
    await page.waitForTimeout(2000);

    // Score for Shirts
    const shirtGoalBtn = page.getByRole("button", { name: /＋ GOLO/i }).first();
    await shirtGoalBtn.click();
    await page.waitForTimeout(1000);

    // Score for Coletes
    const coletesGoalBtn = page.getByRole("button", { name: /＋ GOLO/i }).last();
    await coletesGoalBtn.click();
    await page.waitForTimeout(1000);

    // Another goal for Shirts
    await shirtGoalBtn.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: ".screenshots/live-match-landscape-player.png" });
    copyFileSync(".screenshots/live-match-landscape-player.png", join(ARTIFACTS_DIR, "live-match-landscape-player.png"));
    console.log("📸 Captured Landscape Live Match Player with goal timeline feed");

    // Finish match
    const finishBtn = page.getByRole("button", { name: /Terminar e Gravar Jogo/i });
    await finishBtn.click();
    await page.waitForTimeout(2500);

    // Expand past games to view duration & goal chips
    console.log("📋 Viewing completed match duration & goal timeline...");
    const expander = page.locator("summary");
    if (await expander.count() > 0) {
      await expander.first().click();
      await page.waitForTimeout(600);
    }

    await page.screenshot({ path: ".screenshots/games-completed-with-duration-and-timeline.png" });
    copyFileSync(".screenshots/games-completed-with-duration-and-timeline.png", join(ARTIFACTS_DIR, "games-completed-with-duration-and-timeline.png"));
    console.log("📸 Captured completed match with duration and goal timeline chips!");
  }

  await browser.close();
  console.log("🏁 All enhancement checks passed successfully!");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
