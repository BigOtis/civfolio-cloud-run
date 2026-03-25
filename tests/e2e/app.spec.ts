import { expect, test, type Page } from "@playwright/test";

const INTRO_TITLES = [
  "Founding IBM Software Engineering",
  "Founding Buster's TD",
  "Founding PopCurrent",
  "Founding Character Chat",
  "Founding Robot Future",
  "Founding CivFolio",
  "Founding Polylogue",
  "Founding OtisFuse",
] as const;

async function openWorldMap(
  page: Page,
  options?: { fastIntro?: boolean; introStepMs?: number; introFinalMs?: number },
) {
  if (options?.fastIntro || options?.introStepMs || options?.introFinalMs) {
    await page.addInitScript(() => {
      window.__CIVFOLIO_INTRO_STEP_MS = 420;
      window.__CIVFOLIO_INTRO_FINAL_MS = 260;
    });
  }
  if (options?.introStepMs || options?.introFinalMs) {
    const stepMs = options.introStepMs ?? 420;
    const finalMs = options.introFinalMs ?? 260;
    await page.addInitScript(
      ({ step, final }) => {
        window.__CIVFOLIO_INTRO_STEP_MS = step;
        window.__CIVFOLIO_INTRO_FINAL_MS = final;
      },
      { step: stepMs, final: finalMs },
    );
  }
  await page.goto("/", { waitUntil: "networkidle" }).catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("ERR_CONNECTION_FAILED")) {
      throw error;
    }
    await page.waitForTimeout(500);
    await page.goto("/", { waitUntil: "networkidle" });
  });
  await expect(page.getByRole("heading", { name: /Strategy Map of Work/i })).toBeVisible();
}

async function pressAction(page: Page, label: string) {
  await page.evaluate((buttonLabel) => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (entry) => entry.textContent?.trim() === buttonLabel,
    );
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`Button not found: ${buttonLabel}`);
    }
    button.click();
  }, label);
}

async function skipIntro(page: Page) {
  await pressAction(page, "Skip Intro");
  await expect(page.getByTestId("intro-panel")).toHaveCount(0);
}

async function clickMapCity(page: Page, label: string) {
  await page.waitForFunction(
    (cityLabel) => Boolean(document.querySelector(`circle[aria-label="${cityLabel}"]`)),
    label,
  );
  await page.evaluate((cityLabel) => {
    const city = document.querySelector(`circle[aria-label="${cityLabel}"]`);
    if (!(city instanceof SVGElement)) {
      throw new Error(`City target not found: ${cityLabel}`);
    }
    city.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, label);
}

async function getCityCenter(page: Page, label: string) {
  const city = page.locator(`circle[aria-label="${label}"]`).first();
  await expect(city).toBeVisible();
  const box = await city.boundingBox();
  if (!box) {
    throw new Error(`City target has no bounding box: ${label}`);
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    width: box.width,
    height: box.height,
  };
}

async function setTimelineIndex(page: Page, index: number) {
  const slider = page.getByLabel("Timeline slider");
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error("Timeline slider has no bounding box");
  }

  const min = Number(await slider.getAttribute("min"));
  const max = Number(await slider.getAttribute("max"));
  const ratio = (index - min) / (max - min || 1);
  await page.mouse.move(box.x + box.width * ratio, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
}

async function sampleIntroTitles(page: Page, samples = 16, intervalMs = 180) {
  const seen: string[] = [];

  for (let index = 0; index < samples; index += 1) {
    const text = await page.getByTestId("intro-title").textContent().catch(() => null);
    if (text && seen.at(-1) !== text) {
      seen.push(text);
    }
    await page.waitForTimeout(intervalMs);
  }

  return seen;
}

async function collectIntroTitles(page: Page, expectedTitles: readonly string[]) {
  const seen = new Set<string>();

  await expect
    .poll(
      async () => {
        const text = await page.getByTestId("intro-title").textContent().catch(() => null);
        if (text) {
          seen.add(text);
        }
        return expectedTitles.filter((title) => seen.has(title));
      },
      { timeout: 10000, intervals: [150, 200, 250] },
    )
    .toEqual([...expectedTitles]);

  return [...seen];
}

test.describe("world map interactions", () => {
  test.setTimeout(60000);

  test("intro auto-starts on first load and advances without replay", async ({ page }) => {
    await openWorldMap(page, { introStepMs: 900, introFinalMs: 500 });

    await expect(page.getByTestId("intro-panel")).toBeVisible();
    await expect(page.getByTestId("intro-title")).toHaveText("Founding IBM Software Engineering");

    const seenTitles = await sampleIntroTitles(page, 24, 220);
    expect(seenTitles).toEqual(INTRO_TITLES.slice(0, -1));
  });

  test("intro runs through the full city sequence and can be replayed", async ({ page }) => {
    await openWorldMap(page, { fastIntro: true });

    await expect(page.getByText("Campaign Replay")).toBeVisible();
    await expect(page.getByRole("button", { name: "Replay Intro" })).toHaveCount(0);
    await skipIntro(page);
    await page.getByRole("button", { name: "Replay Intro" }).click();
    await expect(page.getByTestId("intro-title")).toHaveText("Founding IBM Software Engineering");

    await collectIntroTitles(page, INTRO_TITLES);

    await expect.poll(async () => page.getByTestId("intro-panel").count()).toBe(0);
    await expect(page.locator("body")).toContainText(/Time progression\s*2026/i);

    await page.getByRole("button", { name: "Replay Intro" }).click();
    await expect(page.getByTestId("intro-title")).toHaveText("Founding IBM Software Engineering");
    await skipIntro(page);
    await expect(page.locator("body")).toContainText(/Time progression\s*2026/i);

    await expect(page.locator("body")).toContainText("IBM Software Engineering");
    await expect(page.locator("body")).toContainText("Robot Future");
    await expect(page.locator("body")).toContainText("Signal Beacon");
  });

  test("leader profile and map key can open from the HUD", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await page.getByRole("button", { name: "Leader Profile" }).click();
    await expect(page.getByRole("heading", { name: "Phil Lopez", exact: true })).toBeVisible();
    await expect(page.getByText("Founding Principles")).toBeVisible();
    await expect(page.getByText("Current office: IBM Software Engineer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Founding Principles")).toHaveCount(0);

    await page.getByRole("button", { name: "Map Key" }).click();
    await expect(
      page.getByText("Settlements, towns, capitals, and wonders scale with project importance, maturity, and momentum."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Map Key" }).click();
    await expect(
      page.getByText("Settlements, towns, capitals, and wonders scale with project importance, maturity, and momentum."),
    ).toHaveCount(0);
  });

  test("clicking a city opens the in-map dossier and close clears the route state", async ({
    page,
  }) => {
    await openWorldMap(page);

    await page.getByRole("button", { name: "Skip Intro" }).click({ force: true });
    await clickMapCity(page, "Open Robot Future");
    await expect(page).toHaveURL(/work=robot-future/);
    await expect(page.getByText("City Management View")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Robot Future" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open full dossier" })).toHaveAttribute(
      "href",
      "/work/robot-future",
    );

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page).not.toHaveURL(/work=/);
    await expect(page.getByText("City Management View")).toHaveCount(0);
  });

  test("timeline can hide a city and jump back to its founding year", async ({ page }) => {
    await page.goto("/?work=polylogue");

    await expect(page.getByText("City Management View")).toBeVisible();
    await setTimelineIndex(page, 0);
    await expect(page.locator("body")).toContainText(/Time progression\s*2015/i);
    await expect(page.getByText("Not visible in 2015")).toBeVisible();
    await page.getByRole("button", { name: "Jump to 2026" }).click();
    await expect(page.getByText("City Management View")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Polylogue" })).toBeVisible();
  });

  test("filters and zoom controls respond without breaking navigation", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await page.getByRole("button", { name: /^code$/i }).click();
    await expect(page.locator("body")).toContainText(/Map Focus\s*Code/);

    await page.getByRole("button", { name: "+" }).click({ force: true });
    await page.getByRole("button", { name: "-" }).click({ force: true });
    await page.getByRole("button", { name: "Reset" }).click({ force: true });

    await page.getByRole("link", { name: "Civilopedia" }).click();
    await expect(page).toHaveURL(/\/archive$/);
    await expect(page.getByRole("heading", { name: "Browse the empire without the fog." })).toBeVisible();
  });

  test("new video city opens correctly from the map", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await clickMapCity(page, "Open OtisFuse");

    await expect(page).toHaveURL(/work=otisfuse/);
    await expect(page.getByRole("heading", { name: "OtisFuse" })).toBeVisible();
    await expect(page.getByRole("link", { name: "YouTube Channel" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/@otisfuse",
    );
  });

  test("travelers stay engaged once activated", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await page.getByRole("button", { name: "Traveler gstack" }).focus();
    const tooltip = page.locator("div").filter({ hasText: "Traveler · trader" }).first();
    await expect(tooltip).toBeVisible();
    await page.waitForTimeout(1300);
    await expect(tooltip).toBeVisible();
  });

  test("wheel zoom stays anchored to the cursor and feels immediate", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    const before = await getCityCenter(page, "Open Robot Future");
    await page.mouse.move(before.x, before.y);
    await page.mouse.wheel(0, -720);
    await page.waitForTimeout(120);
    const after = await getCityCenter(page, "Open Robot Future");

    expect(Math.abs(after.x - before.x)).toBeLessThan(10);
    expect(Math.abs(after.y - before.y)).toBeLessThan(10);
    expect(after.width).toBeGreaterThan(before.width * 1.08);
  });

  test("mobile layout keeps the map usable and primary controls reachable", async ({
    browser,
  }) => {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Skip Intro" })).toBeVisible();
    await expect(page.getByLabel("Timeline slider")).toBeVisible();
    await skipIntro(page);
    await clickMapCity(page, "Open PopCurrent");
    await expect(page.getByText("City Management View")).toBeVisible();
    await expect(page.getByAltText("The PopCurrent social preview image from the live site.")).toBeVisible();
    await page.close();
  });
});

test.describe("canonical routes", () => {
  test("map can deep link directly into a city panel", async ({ page }) => {
    await page.goto("/?work=robot-future", { waitUntil: "networkidle" });

    await expect(page.getByText("City Management View")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Robot Future" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open full dossier" })).toHaveAttribute(
      "href",
      "/work/robot-future",
    );
  });

  test("archive can navigate into a canonical dossier page", async ({ page }) => {
    await page.goto("/archive", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Browse the empire without the fog." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open dossier" })).toHaveCount(9);

    await page.getByRole("link", { name: "Open dossier" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("about page presents leader details and contact links cleanly", async ({ page }) => {
    await page.goto("/about", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Phil Lopez" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Signals" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "GitHub" })).toBeVisible();
    await expect(page.getByText("Current role: IBM Software Engineer")).toBeVisible();
  });

  test("work routes remain shareable", async ({ page }) => {
    await page.goto("/work/robot-future", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/work\/robot-future$/);
    await expect(page.getByRole("heading", { name: "Robot Future" })).toBeVisible();
  });
});
