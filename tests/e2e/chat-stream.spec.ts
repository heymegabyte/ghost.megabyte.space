import { test, expect, type Page, type Route } from "@playwright/test";

const PROD = process.env.PROD_URL || "https://ghost.megabyte.space";

const BREAKPOINTS = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-13", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wide", width: 1920, height: 1080 },
] as const;

test.use({ baseURL: PROD });

function encodeSse(events: object[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
}

async function mockChatStream(page: Page, frames: object[], opts: { delayMs?: number } = {}) {
  await page.route("**/api/v1/chat/stream", async (route: Route) => {
    const body = encodeSse(frames);
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "x-session-id": "test-session-stream",
      },
      body,
    });
  });
}

async function openChat(page: Page) {
  await page.goto("/");
  const toggle = page.locator("#chat-toggle, #open-chat").first();
  await toggle.click();
  await expect(page.locator("#chat-panel")).toBeVisible();
}

test.describe("AI Chat — streaming, abort, suggestions, feedback", () => {
  for (const bp of BREAKPOINTS) {
    test(`streams delta and renders bubble [${bp.name}]`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await mockChatStream(page, [
        { type: "start", sessionId: "test-session-stream", messageId: "msg-abc" },
        { type: "delta", text: "Signal " },
        { type: "delta", text: "received." },
        { type: "suggestions", items: ["Explain the EMF chart", "Show me transmissions"] },
        { type: "done", sessionId: "test-session-stream", messageId: "msg-abc", aborted: false },
      ]);
      await openChat(page);

      const input = page.locator("#chat-input");
      await input.fill("hello");
      await page.locator("#chat-send").click();

      const bubble = page.locator(".chat-message.chat-assistant").last();
      await expect(bubble).toContainText("Signal received.");
      await expect(bubble.locator(".chat-suggestion-chip")).toHaveCount(2);
      await expect(bubble).toHaveAttribute("data-msg-id", "msg-abc");
      await expect(bubble.locator(".chat-feedback-btn")).toHaveCount(2);
    });
  }

  test("stop button aborts in-flight stream", async ({ page }) => {
    await page.route("**/api/v1/chat/stream", async (route: Route) => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "start", sessionId: "s", messageId: "m" })}\n\n`));
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "delta", text: "Begin" })}\n\n`));
        },
      });
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-session-id": "s" },
        body: await new Response(stream).text(),
      });
    });
    await openChat(page);
    await page.locator("#chat-input").fill("never finishes");
    await page.locator("#chat-send").click();
    const stop = page.locator("#chat-stop-stream");
    await expect(stop).toBeVisible();
    await stop.click();
    await expect(stop).toBeHidden();
  });

  test("rate-limit 429 shows countdown bubble", async ({ page }) => {
    await page.route("**/api/v1/chat/stream", async (route: Route) => {
      const reset = Math.floor(Date.now() / 1000) + 5;
      await route.fulfill({
        status: 429,
        headers: { "x-ratelimit-reset": String(reset) },
        body: JSON.stringify({ error: "rate limited" }),
      });
    });
    await openChat(page);
    await page.locator("#chat-input").fill("hi");
    await page.locator("#chat-send").click();
    await expect(page.locator(".chat-rate-limit")).toBeVisible();
    await expect(page.locator(".chat-rate-countdown")).toContainText("s");
  });

  test("feedback POST fires on thumbs click", async ({ page }) => {
    let postedRating: number | null = null;
    await page.route("**/api/v1/chat/feedback", async (route: Route) => {
      const body = route.request().postDataJSON();
      postedRating = body.rating;
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    });
    await mockChatStream(page, [
      { type: "start", sessionId: "fb-session", messageId: "msg-fb" },
      { type: "delta", text: "Reply" },
      { type: "done", sessionId: "fb-session", messageId: "msg-fb", aborted: false },
    ]);
    await openChat(page);
    await page.locator("#chat-input").fill("rate me");
    await page.locator("#chat-send").click();
    const bubble = page.locator(".chat-message.chat-assistant").last();
    await expect(bubble).toContainText("Reply");
    await bubble.locator('.chat-feedback-btn[data-rating="1"]').click();
    await expect.poll(() => postedRating).toBe(1);
  });

  test("chat-open state persists across reloads", async ({ page }) => {
    await mockChatStream(page, [
      { type: "start", sessionId: "persist", messageId: "m" },
      { type: "delta", text: "ok" },
      { type: "done", sessionId: "persist", messageId: "m", aborted: false },
    ]);
    await openChat(page);
    await page.reload();
    await expect(page.locator("#chat-panel")).toBeVisible({ timeout: 5000 });
  });
});
