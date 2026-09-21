import { expect, test } from "@playwright/test";

/**
 * Timeline evidence-image coverage.
 *
 * The homepage "Timeline" section (#timeline-track) must render one card per
 * chronicle event, and EVERY card must carry a related image so each entry has
 * visual validity. Runs against the local dev server by default; set PROD_URL to
 * verify the deployed site (e.g. PROD_URL=https://ghost.megabyte.space).
 */

const TARGET = process.env.PROD_URL || "/";
const MIN_EVENTS = 16;

test.describe("timeline evidence images", () => {
  test("every timeline entry renders a related image", async ({ page }) => {
    await page.goto(TARGET, { waitUntil: "domcontentloaded" });

    const track = page.locator("#timeline-track");
    await expect(track).toBeAttached();

    const items = track.locator(".tl-item");
    await expect
      .poll(() => items.count(), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(MIN_EVENTS);

    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const img = item.locator(".tl-media img");
      await expect(img, `item ${i} has an image`).toHaveCount(1);

      // Bring the (lazy) image into view and confirm it actually decodes.
      await img.scrollIntoViewIfNeeded();
      const src = await img.getAttribute("src");
      const alt = await img.getAttribute("alt");
      expect(src, `item ${i} image has a src`).toBeTruthy();
      expect((alt || "").trim().length, `item ${i} image has alt text`).toBeGreaterThan(0);

      await expect
        .poll(
          () => img.evaluate((el) => (el as HTMLImageElement).naturalWidth),
          { timeout: 10_000, message: `item ${i} image (${src}) loads` },
        )
        .toBeGreaterThan(0);
    }
  });

  test("timeline images are visible (reveal state applied)", async ({ page }) => {
    await page.goto(TARGET, { waitUntil: "domcontentloaded" });
    const firstCard = page.locator("#timeline-track .tl-item").first();
    await firstCard.scrollIntoViewIfNeeded();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator(".tl-media img")).toBeVisible();
  });
});
