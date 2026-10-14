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

  // Handle alert dialogs
  page.on("dialog", async (dialog) => {
    console.log(`📢 Dialog message: ${dialog.message()}`);
    await dialog.accept();
  });

  await page.addInitScript((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
  }, session);

  // 1. Convocations Page
  console.log("📋 Navigating to /convocations...");
  await page.goto("http://localhost:5173/convocations", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Initial screenshot showing quorum badges and "🔄 Automática" button
  const convocationsPath = ".screenshots/convocations-live-item3.png";
  await page.screenshot({ path: convocationsPath, fullPage: true });
  copyFileSync(convocationsPath, join(ARTIFACTS_DIR, "convocations-live-item3.png"));
  console.log("📸 Convocations initial screenshot captured!");

  // Click on "Automática"
  const autoBtn = page.getByRole("button", { name: "Automática" });
  if (await autoBtn.count() > 0) {
    console.log("🔘 Clicking 'Automática' button...");
    await autoBtn.click();
    await page.waitForTimeout(2000);

    const afterAutoPath = ".screenshots/convocations-after-auto.png";
    await page.screenshot({ path: afterAutoPath, fullPage: true });
    copyFileSync(afterAutoPath, join(ARTIFACTS_DIR, "convocations-after-auto.png"));
    console.log("📸 Convocations after auto screenshot captured!");
  } else {
    console.log("⚠️ Could not find 'Automática' button!");
  }

  await browser.close();
  console.log("🏁 Live pass completed successfully!");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
