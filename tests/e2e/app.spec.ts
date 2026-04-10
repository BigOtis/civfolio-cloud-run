import { expect, test, type Page } from "@playwright/test";

const INTRO_TITLES = [
  "Founding IBM Software Engineering",
  "Founding Buster's TD",
  "Founding LocalTalker",
  "Founding PopCurrent",
  "Founding Character Chat",
  "Founding Robot Future",
  "Founding CivFolio",
  "Founding Polylogue",
  "Founding OtisFuse",
] as const;

async function openWorldMap(
  page: Page,
  options?: {
    fastIntro?: boolean;
    introStepMs?: number;
    introFinalMs?: number;
    creatorPromptDelayMs?: number;
    creatorPromptLifetimeMs?: number;
  },
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
  if (options?.creatorPromptDelayMs || options?.creatorPromptLifetimeMs) {
    const delayMs = options.creatorPromptDelayMs ?? 60_000;
    const lifetimeMs = options.creatorPromptLifetimeMs ?? 20_000;
    await page.addInitScript(
      ({ delay, lifetime }) => {
        window.__CIVFOLIO_CREATOR_PROMPT_DELAY_MS = delay;
        window.__CIVFOLIO_CREATOR_PROMPT_LIFETIME_MS = lifetime;
      },
      { delay: delayMs, lifetime: lifetimeMs },
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

async function skipIntroIfVisible(page: Page) {
  if ((await page.getByTestId("intro-panel").count()) > 0) {
    await skipIntro(page);
  }
}

async function getCityMetrics(page: Page, slug: string) {
  await page.waitForFunction(
    (citySlug) => Boolean(window.__CIVFOLIO_MAP_TEST__?.getCityMetrics(citySlug)),
    slug,
  );
  const metrics = await page.evaluate((citySlug) => {
    return window.__CIVFOLIO_MAP_TEST__?.getCityMetrics(citySlug) ?? null;
  }, slug);

  if (!metrics) {
    throw new Error(`City target not found: ${slug}`);
  }

  return metrics;
}

async function clickMapCity(page: Page, slug: string) {
  await page.waitForFunction(
    (citySlug) => Boolean(window.__CIVFOLIO_MAP_TEST__?.openCity(citySlug)),
    slug,
  );
  const opened = await page.evaluate((citySlug) => {
    return window.__CIVFOLIO_MAP_TEST__?.openCity(citySlug) ?? false;
  }, slug);

  if (!opened) {
    throw new Error(`City target not found: ${slug}`);
  }
}

async function hoverMapCity(page: Page, slug: string) {
  const metrics = await getCityMetrics(page, slug);
  await page.mouse.move(8, 8);
  const hoverPoints = [
    { x: metrics.x, y: metrics.y },
    { x: metrics.x + metrics.radius * 0.14, y: metrics.y },
    { x: metrics.x - metrics.radius * 0.14, y: metrics.y },
    { x: metrics.x, y: metrics.y + metrics.radius * 0.14 },
    { x: metrics.x, y: metrics.y - metrics.radius * 0.14 },
  ];

  for (const point of hoverPoints) {
    await page.mouse.move(point.x, point.y, { steps: 3 });
    await page.waitForTimeout(60);
  }
  return metrics;
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

    const seenTitles = await collectIntroTitles(page, INTRO_TITLES);
    expect(seenTitles).toEqual(INTRO_TITLES);
  });

  test("intro does not reveal future cities before their turn", async ({ page }) => {
    await openWorldMap(page, { introStepMs: 1100, introFinalMs: 500 });

    await expect
      .poll(async () => page.getByTestId("intro-title").textContent().catch(() => null))
      .toBe("Founding LocalTalker");

    await expect
      .poll(async () => page.evaluate(() => window.__CIVFOLIO_MAP_TEST__?.getCityMetrics("localtalker") ?? null))
      .not.toBeNull();
    await expect
      .poll(async () => page.evaluate(() => window.__CIVFOLIO_MAP_TEST__?.getCityMetrics("polylogue") ?? null))
      .toBeNull();
    await expect
      .poll(async () => page.evaluate(() => window.__CIVFOLIO_MAP_TEST__?.getCityMetrics("otisfuse") ?? null))
      .toBeNull();
  });

  test("intro runs through the full city sequence and can be replayed", async ({ page }) => {
    await openWorldMap(page, { fastIntro: true });

    await expect(page.getByText("Campaign Replay")).toBeVisible();
    await expect(page.getByRole("button", { name: "Replay Intro" })).toHaveCount(0);
    await skipIntro(page);
    await pressAction(page, "Replay Intro");
    await expect(page.getByTestId("intro-title")).toHaveText("Founding IBM Software Engineering");

    await collectIntroTitles(page, INTRO_TITLES);

    await expect.poll(async () => page.getByTestId("intro-panel").count()).toBe(0);
    await expect(page.locator("body")).toContainText(/Time progression\s*2026/i);

    await pressAction(page, "Replay Intro");
    await expect(page.getByTestId("intro-title")).toHaveText("Founding IBM Software Engineering");
    await skipIntro(page);
    await expect(page.locator("body")).toContainText(/Time progression\s*2026/i);

    await expect.poll(async () => page.evaluate(() => window.__CIVFOLIO_MAP_TEST__?.getCityMetrics("robot-future"))).not.toBeNull();
    await expect.poll(async () => page.evaluate(() => window.__CIVFOLIO_MAP_TEST__?.getCityMetrics("ibm-support-innovation"))).not.toBeNull();
  });

  test("leader profile and map key can open from the HUD", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await pressAction(page, "Leader Profile");
    await expect(page.getByRole("heading", { name: "Phil Lopez", exact: true })).toBeVisible();
    await expect(page.getByText("Founding Principles")).toBeVisible();
    await expect(page.getByText("Current office: IBM Software Engineer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Founding Principles")).toHaveCount(0);

    await pressAction(page, "Map Key");
    await expect(
      page.getByText("Settlements, towns, capitals, and wonders scale with project importance, maturity, and momentum."),
    ).toBeVisible();
    await pressAction(page, "Map Key");
    await expect(
      page.getByText("Settlements, towns, capitals, and wonders scale with project importance, maturity, and momentum."),
    ).toHaveCount(0);
  });

  test("clicking a city opens the in-map dossier and close clears the route state", async ({
    page,
  }) => {
    await openWorldMap(page);

    await page.getByRole("button", { name: "Skip Intro" }).click({ force: true });
    await clickMapCity(page, "robot-future");
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

    await skipIntroIfVisible(page);
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

    await expect(page.getByRole("link", { name: "Civilopedia" })).toHaveAttribute("href", "/archive");
    await page.goto("/archive", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Browse the empire without the fog." })).toBeVisible();
  });

  test("civilopedia navigation does not throw on map teardown", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await openWorldMap(page);
    await skipIntro(page);
    await Promise.all([
      page.waitForURL(/\/archive$/),
      page.getByRole("link", { name: "Civilopedia" }).click({ force: true }),
    ]);
    await expect(page).toHaveURL(/\/archive$/);
    await expect(page.getByRole("heading", { name: "Browse the empire without the fog." })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("new video city opens correctly from the map", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await clickMapCity(page, "otisfuse");

    await expect(page).toHaveURL(/work=otisfuse/);
    await expect(page.getByRole("heading", { name: "OtisFuse" })).toBeVisible();
    await expect(page.getByRole("link", { name: "YouTube Channel" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/@otisfuse",
    );
  });

  test("hover tooltip stays visually anchored to the hovered city", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await hoverMapCity(page, "robot-future");
    const tooltip = page.getByTestId("city-tooltip");
    const mapSurface = page.locator('[data-map-drag-surface="true"]');
    await expect
      .poll(async () => tooltip.getAttribute("data-city-slug").catch(() => null))
      .toBe("robot-future");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveAttribute("data-city-slug", "robot-future");
    await expect(tooltip).toContainText("Robot Future");

    const [box, containerBox, anchor] = await Promise.all([
      tooltip.boundingBox(),
      mapSurface.boundingBox(),
      tooltip.evaluate((node) => ({
        x: Number(node.getAttribute("data-city-screen-x")),
        y: Number(node.getAttribute("data-city-screen-y")),
      })),
    ]);

    if (!box || !containerBox) {
      throw new Error("City tooltip or container is missing box metrics");
    }

    const cityX = containerBox.x + anchor.x;
    const cityY = containerBox.y + anchor.y;
    const horizontalGap = cityX < box.x ? box.x - cityX : cityX - (box.x + box.width);
    const verticalOffset = Math.abs(box.y + box.height / 2 - cityY);

    expect(horizontalGap).toBeLessThan(40);
    expect(verticalOffset).toBeLessThan(52);
  });

  test("hover tooltip remains on-screen for edge cities", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await hoverMapCity(page, "otisfuse");
    const tooltip = page.getByTestId("city-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveAttribute("data-city-slug", "otisfuse");

    const box = await tooltip.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) {
      throw new Error("Tooltip or viewport metrics missing");
    }

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });

  test("travelers open on click and deselect on background click", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    await page.waitForFunction(() => window.__CIVFOLIO_MAP_TEST__?.selectUnit("gstack-caravan") === true);
    await page.evaluate(() => {
      window.__CIVFOLIO_MAP_TEST__?.selectUnit("gstack-caravan");
    });
    const tooltip = page.locator("div").filter({ hasText: /Traveler.*Trader/i }).first();
    await expect(tooltip).toBeVisible();
    await page.evaluate(() => {
      window.__CIVFOLIO_MAP_TEST__?.clearSelection();
    });
    await expect(tooltip).toHaveCount(0);
  });

  test("map zoom keeps a city anchored while increasing its apparent size", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    const before = await getCityMetrics(page, "robot-future");
    const zoomed = await page.evaluate(() => {
      return window.__CIVFOLIO_MAP_TEST__?.zoomCameraOnCity("robot-future", 0.32) ?? false;
    });
    expect(zoomed).toBe(true);
    await page.waitForTimeout(120);
    const after = await getCityMetrics(page, "robot-future");

    expect(Math.abs(after.x - before.x)).toBeLessThan(10);
    expect(Math.abs(after.y - before.y)).toBeLessThan(10);
    expect(after.radius - before.radius).toBeGreaterThan(0.5);
  });

  test("map camera can pan and moves visible cities on screen", async ({ page }) => {
    await openWorldMap(page);

    await skipIntro(page);
    const panned = await page.evaluate(() => {
      const mapTest = window.__CIVFOLIO_MAP_TEST__;
      const origin = mapTest?.getCityMetrics("robot-future");
      if (!mapTest || !origin) {
        return false;
      }

      mapTest.panCameraBy(150, 90);
      const firstAttempt = mapTest.getCityMetrics("robot-future");
      if (firstAttempt && Math.hypot(firstAttempt.x - origin.x, firstAttempt.y - origin.y) > 4) {
        return true;
      }

      mapTest.panCameraBy(-300, 0);
      const secondAttempt = mapTest.getCityMetrics("robot-future");
      return Boolean(secondAttempt && Math.hypot(secondAttempt.x - origin.x, secondAttempt.y - origin.y) > 4);
    });
    expect(panned).toBe(true);
    await expect(page.getByText("City Management View")).toHaveCount(0);
  });

  test("creator prompt appears in the corner and dismisses itself", async ({ page }) => {
    await openWorldMap(page, { creatorPromptDelayMs: 1200, creatorPromptLifetimeMs: 1200 });

    await skipIntro(page);
    const prompt = page.getByTestId("creator-prompt");
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText("Enjoy what you're seeing here? Want to create your own?");
    await expect(prompt.getByRole("link", { name: "CivFolio README" })).toHaveAttribute(
      "href",
      "https://github.com/BigOtis/CivFolio",
    );

    await page.waitForTimeout(1700);
    await expect(prompt).toHaveCount(0);
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
    await expect(page.getByRole("link", { name: "Robot Future" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Skip Intro" })).toBeVisible();
    await expect(page.getByLabel("Timeline slider")).toHaveCount(0);
    await page.getByRole("button", { name: "Skip Intro" }).click();
    await expect(page.getByTestId("intro-panel")).toHaveCount(0);
    await expect(page.getByLabel("Timeline slider")).toBeVisible();
    await page.getByRole("button", { name: "Map Key" }).click();
    await expect(page.locator("body")).toContainText("Great Works are landmark achievements.");
    await page.getByRole("button", { name: "Close" }).click();
    await clickMapCity(page, "popcurrent");
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
    await expect(page.getByRole("link", { name: "Open dossier" })).toHaveCount(10);

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

