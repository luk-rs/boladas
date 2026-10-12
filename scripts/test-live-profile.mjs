import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync(".screenshots", { recursive: true });

const vite = spawn("pnpm", ["dev:app", "--port", "5174"], {
  stdio: "pipe",
  shell: true,
  detached: true,
});

await new Promise((r) => setTimeout(r, 2000));

try {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 450, height: 850 },
  });

  const page = await context.newPage();

  const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItMSIsImVtYWlsIjoidGlhZ29AYm9sYWRhcy5wdCIsImV4cCI6OTk5OTk5OTk5OSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQifQ.fake_signature";
  const fakeSession = {
    access_token: fakeJwt,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 9999999999,
    refresh_token: "fake-refresh",
    user: {
      id: "usr-1",
      aud: "authenticated",
      role: "authenticated",
      email: "tiago@boladas.pt",
      app_metadata: { provider: "email" },
      user_metadata: { full_name: "Tiago Silva" },
    },
  };

  await page.route("**/auth/v1/**", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeSession.user),
    });
  });

  await page.route("**/rest/v1/**", async (route) => {
    const url = route.request().url();

    if (url.includes("team_member_roles") || url.includes("team_members")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "tm-1",
            team_id: "team-1",
            roles: [{ role: "player" }, { role: "member" }],
            team: { id: "team-1", name: "Futebolada das Terças" },
          },
        ]),
      });
    }

    if (url.includes("profiles")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "usr-1", display_name: "Tiago Silva", is_system_admin: true }),
      });
    }

    if (url.includes("convocation_votes")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { state: "ball" },
          { state: "ball" },
          { state: "couch" },
        ]),
      });
    }

    if (url.includes("convocations")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "c-1", scheduled_at: new Date().toISOString() },
        ]),
      });
    }

    if (url.includes("games")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "g-1",
            status: "completed",
            shirts_score: 8,
            coletes_score: 5,
            scheduled_at: "2026-10-06T19:30:00Z",
            completed_at: "2026-10-06T20:30:00Z",
            shirts_lineup: [{ id: "usr-1", name: "Tiago Silva" }],
            coletes_lineup: [{ id: "usr-2", name: "Rui Pedro" }],
          },
          {
            id: "g-2",
            status: "completed",
            shirts_score: 3,
            coletes_score: 3,
            scheduled_at: "2026-09-29T19:30:00Z",
            completed_at: "2026-09-29T20:30:00Z",
            shirts_lineup: [{ id: "usr-1", name: "Tiago Silva" }],
            coletes_lineup: [{ id: "usr-2", name: "Rui Pedro" }],
          },
          {
            id: "g-3",
            status: "completed",
            shirts_score: 4,
            coletes_score: 6,
            scheduled_at: "2026-09-22T19:30:00Z",
            completed_at: "2026-09-22T20:30:00Z",
            shirts_lineup: [{ id: "usr-1", name: "Tiago Silva" }],
            coletes_lineup: [{ id: "usr-2", name: "Rui Pedro" }],
          },
        ]),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.addInitScript((session) => {
    const raw = JSON.stringify(session);
    for (const key of Object.keys(localStorage)) {
      if (key.includes("auth-token")) localStorage.removeItem(key);
    }
    localStorage.setItem("sb-localhost-auth-token", raw);
    localStorage.setItem("sb-127-auth-token", raw);
    localStorage.setItem("sb-jqvynvxpnotjnfdxmdwj-auth-token", raw);
  }, fakeSession);

  console.log("Navigating to http://localhost:5174/profile...");
  await page.goto("http://localhost:5174/profile", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: ".screenshots/profile-live.png" });
  console.log("Screenshot saved to .screenshots/profile-live.png");

  await browser.close();
} finally {
  try {
    process.kill(-vite.pid);
  } catch {
    vite.kill();
  }
}
process.exit(0);
