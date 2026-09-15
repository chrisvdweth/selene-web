#!/usr/bin/env node
/**
 * SELENE functional regression harness.
 *
 * Proves that the redesign preserved behaviour. Written against roles, text and
 * hrefs rather than CSS classes so it survives a visual redesign.
 *
 * Usage: node design-review/verify.mjs --base http://localhost:4321
 */
import { chromium, devices } from "playwright";

const args = process.argv.slice(2);
const readArg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? d : args[i + 1];
};
const BASE = (readArg("base", "http://localhost:4321") ?? "").replace(/\/$/, "");

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 200) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch();

/* ---------------------------------------------------------------- desktop */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // --- every internal link in the header and footer resolves
  const navHrefs = await page.$$eval("header a[href^='/'], footer a[href^='/'], header a[href^='#'], footer a[href^='#']", (as) =>
    [...new Set(as.map((a) => a.getAttribute("href")))]
  );
  check("header/footer expose internal navigation", navHrefs.length >= 4, navHrefs.join(" "));
  for (const href of navHrefs) {
    if (href.startsWith("#")) continue;
    const res = await page.request.get(BASE + href);
    check(`nav link resolves ${href}`, res.ok(), `status ${res.status()}`);
  }

  // --- theme toggle actually repaints
  const readBg = () =>
    page.evaluate(() => {
      const body = getComputedStyle(document.body).backgroundColor;
      const opaque = (c) => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent";
      return opaque(body) ? body : getComputedStyle(document.documentElement).backgroundColor;
    });
  const bgBefore = await readBg();
  const toggle = page
    .locator(
      "header button[aria-label*='theme' i], header button[aria-label*='dark' i], header button[aria-label*='light' i], header button[title*='theme' i], #theme"
    )
    .first();
  const hasToggle = (await toggle.count()) > 0;
  check("theme control present in header", hasToggle);
  if (hasToggle) {
    await toggle.click();
    await page.waitForTimeout(400);
    const bgAfter = await readBg();
    check("theme control changes page background", bgBefore !== bgAfter, `${bgBefore} -> ${bgAfter}`);
    const persisted = await page.evaluate(() => {
      const r = document.documentElement;
      return r.classList.contains("dark") || r.dataset.theme === "dark" || r.getAttribute("data-theme") === "dark";
    });
    check("dark state is expressed on <html>", persisted);
    await toggle.click();
    await page.waitForTimeout(250);
  }

  // --- atlas search narrows the graph
  await page.goto(`${BASE}/graph/show/linear-regression`, { waitUntil: "networkidle" });
  const searchBox = page.locator("input[type='search'], input:not([type]), input[type='text']").first();
  if ((await searchBox.count()) > 0) {
    const countNodes = () => page.locator("svg [data-topic], svg g.topic-node, svg a.topic-node, svg circle").count();
    const before = await countNodes();
    await searchBox.fill("transformer");
    await page.waitForTimeout(500);
    const after = await countNodes();
    check("atlas search narrows the node set", after > 0 && after < before, `${before} -> ${after}`);
    await searchBox.fill("");
    await page.waitForTimeout(300);
  } else {
    check("atlas search input exists", false, "no text input found on graph route");
  }

  // --- a graph node leads to a topic route
  const nodeTarget = await page.evaluate(() => {
    const a = document.querySelector("svg a[href*='/topics/']");
    if (a) return a.getAttribute("href") || a.getAttribute("xlink:href");
    const n = document.querySelector("svg [data-topic-href]");
    return n ? n.getAttribute("data-topic-href") : null;
  });
  if (nodeTarget) {
    const res = await page.request.get(BASE + nodeTarget);
    check("graph node links to a topic page", res.ok(), `${nodeTarget} status ${res.status()}`);
  } else {
    const clickable = page.locator("svg g[role='button'], svg g.topic-node, svg [tabindex='0']").first();
    if ((await clickable.count()) > 0) {
      await clickable.click({ force: true });
      await page.waitForTimeout(900);
      check("graph node click navigates to a topic page", /\/topics\//.test(page.url()), page.url());
    } else {
      check("graph node is activatable", false, "no link, role=button or focusable node in svg");
    }
  }

  // --- topic detail keeps all three artifact actions
  await page.goto(`${BASE}/topics/transformer-attention`, { waitUntil: "networkidle" });
  const hrefs = await page.$$eval("main a[href], article a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
  const html = hrefs.find((h) => /\/notebooks\/.+\.html$/.test(h));
  const ipynb = hrefs.find((h) => /\/notebooks\/.+\.ipynb$/.test(h));
  const colab = hrefs.find((h) => h.includes("colab.research.google.com"));
  check("topic page links rendered notebook HTML", !!html, html);
  check("topic page links downloadable .ipynb", !!ipynb, ipynb);
  check("topic page links Colab", !!colab, colab);
  if (html) {
    const r = await page.request.get(BASE + html);
    check("rendered notebook HTML resolves", r.ok(), `status ${r.status()}`);
  }
  if (ipynb) {
    const r = await page.request.get(BASE + ipynb);
    check("notebook .ipynb resolves", r.ok(), `status ${r.status()}`);
  }
  const dl = await page.$$eval("main a[download], article a[download]", (as) => as.length);
  check("local download uses the download attribute", dl > 0, `${dl} download link(s)`);

  const prereqLinks = await page.$$eval("main a[href^='/topics/'], article a[href^='/topics/']", (as) =>
    [...new Set(as.map((a) => a.getAttribute("href")))]
  );
  check("topic page exposes prerequisite / related topic links", prereqLinks.length >= 1, prereqLinks.join(" "));

  const iframeCount = await page.locator("iframe").count();
  check("notebook reader embed still present", iframeCount >= 1, `${iframeCount} iframe(s)`);

  // --- prerequisite editor still round-trips CSV
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const ta = page.locator("textarea").first();
  check("prerequisite editor exposes a textarea", (await ta.count()) > 0);
  const csvText = (await ta.count()) > 0 ? await ta.inputValue() : "";
  check("prerequisite editor is seeded with CSV rows", /source|target|,/.test(csvText) && csvText.split("\n").length > 1, csvText.split("\n")[0]);
  if ((await ta.count()) > 0) {
    await ta.fill(`${csvText.trim()}\nlinear-regression,principal-components`);
  }
  const dlTrigger = page.locator("a:has-text('Download'), button:has-text('Download'), #download").first();
  check("prerequisite editor exposes a download control", (await dlTrigger.count()) > 0);
  if ((await dlTrigger.count()) > 0) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 8000 }).catch(() => null),
      dlTrigger.click(),
    ]);
    check("prerequisite editor downloads edited CSV", !!download, download ? download.suggestedFilename() : "no download event");
    if (download) {
      const stream = await download.createReadStream();
      let body = "";
      for await (const chunk of stream) body += chunk;
      check("downloaded CSV contains the local edit", body.includes("linear-regression,principal-components"), `${body.length} bytes`);
    }
  }

  // --- topic search / library route lists topics
  await page.goto(`${BASE}/topics`, { waitUntil: "networkidle" });
  const topicLinks = await page.$$eval("main a[href^='/topics/']", (as) => as.length);
  check("topic library lists topic links", topicLinks >= 10, `${topicLinks} links`);
  const filter = page.locator("input[type='search'], main input[type='text'], main input:not([type])").first();
  if ((await filter.count()) > 0) {
    await filter.fill("tokenization");
    await page.waitForTimeout(500);
    const filtered = await page.$$eval("main a[href^='/topics/']", (as) => as.filter((a) => a.offsetParent !== null).length);
    check("topic library search filters the list", filtered > 0 && filtered < topicLinks, `${topicLinks} -> ${filtered}`);
  } else {
    check("topic library exposes a search input", false, "no input on /topics");
  }

  check("no console or page errors during the desktop pass", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

/* ----------------------------------------------------------------- mobile */
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check("home has no horizontal overflow at 390px", noOverflow);

  const navVisible = await page.evaluate(() => {
    const vw = window.innerWidth;
    const links = [...document.querySelectorAll("header a[href], header button")];
    const visible = links.filter((a) => {
      const r = a.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right <= vw + 1 && r.left >= -1;
    });
    return { total: links.length, visible: visible.length, clipped: links.length - visible.length };
  });
  check("no header control is clipped on mobile", navVisible.clipped === 0, JSON.stringify(navVisible));

  const disclosure = page
    .locator(
      "header button[aria-expanded], header button[aria-controls], header [aria-label*='menu' i], header details summary, nav button[aria-expanded]"
    )
    .first();
  if ((await disclosure.count()) > 0) {
    await disclosure.click();
    await page.waitForTimeout(400);
    const revealed = await page.evaluate(() => {
      const links = [...document.querySelectorAll("header a[href], nav a[href], dialog a[href], [role=dialog] a[href]")];
      return links.filter((a) => a.getBoundingClientRect().height > 0).length;
    });
    check("mobile navigation disclosure reveals the routes", revealed >= 4, `${revealed} visible links`);
  } else {
    const reachable = await page.evaluate(() => {
      const hrefs = [...document.querySelectorAll("a[href^='/']")]
        .filter((a) => a.getBoundingClientRect().height > 0)
        .map((a) => a.getAttribute("href"));
      return [...new Set(hrefs)];
    });
    check(
      "primary routes are reachable on mobile without a disclosure",
      reachable.some((h) => h.startsWith("/topics")) && reachable.some((h) => h.startsWith("/graph")),
      reachable.join(" ")
    );
  }

  const tapTargets = await page.evaluate(() => {
    const bad = [];
    const wordmark = document.querySelector("header a[href='/'], header a[href='']");
    for (const el of document.querySelectorAll("a[href], button, input, textarea, summary, [role=button]")) {
      if (el === wordmark) continue; // the wordmark is a logo, not a tap target
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      // Inline links (prose links inside sentences) are exempt; blocks and controls are not.
      if (cs.display === "inline") continue;
      if (r.height < 40) bad.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 24)}=${Math.round(r.height)}px`);
    }
    return bad;
  });
  check("mobile controls are at least 40px tall", tapTargets.length === 0, tapTargets.slice(0, 6).join(" "));

  await page.goto(`${BASE}/topics/transformer-attention`, { waitUntil: "networkidle" });
  const topicNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check("topic detail has no horizontal overflow at 390px", topicNoOverflow);

  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const adminNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check("prerequisite editor has no horizontal overflow at 390px", adminNoOverflow);

  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILURES:");
  for (const f of failed) console.log(`  - ${f.name} — ${f.detail}`);
  process.exitCode = 1;
}
