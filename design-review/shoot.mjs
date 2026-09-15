#!/usr/bin/env node
/**
 * SELENE design-review harness.
 *
 * Captures full-page screenshots of every major route across desktop + mobile
 * viewports in both themes, and reports objective defects:
 *   - horizontal overflow (documentElement.scrollWidth > viewport width)
 *   - console errors / page errors
 *   - touch targets smaller than 44x44 CSS px on mobile
 *   - elements that stick out past the viewport's right edge
 *
 * Usage:
 *   node design-review/shoot.mjs --base http://localhost:4321 --out design-review/before
 *   node design-review/shoot.mjs --base http://localhost:4321 --out design-review/after
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const BASE = (readArg("base", "http://localhost:4321") ?? "").replace(/\/$/, "");
const OUT = readArg("out", "design-review/shots");
const ONLY = readArg("only", null);

const ROUTES = [
  { name: "home", url: "/" },
  { name: "topics-search", url: "/topics" },
  { name: "topic-detail", url: "/topics/transformer-attention" },
  { name: "graph-show", url: "/graph/show/linear-regression" },
  { name: "graph-mastery", url: "/graph/mastery/neural-networks" },
  { name: "graph-ego", url: "/graph/ego/transformer-attention" },
  { name: "prereq-editor", url: "/admin" },
  { name: "about", url: "/about" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

const THEMES = ["light", "dark"];

const INTERACTIVE = "a, button, input, textarea, select, summary, [role=button], [tabindex]:not([tabindex='-1'])";

const probe = `(() => {
  const doc = document.documentElement;
  const vw = window.innerWidth;
  const overflow = Math.max(0, Math.round(doc.scrollWidth - vw));
  const spill = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1) {
      spill.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute("class") || "").slice(0, 60),
        right: Math.round(r.right),
        overBy: Math.round(r.right - vw),
      });
    }
  }
  const smallTargets = [];
  for (const el of document.querySelectorAll(${JSON.stringify(INTERACTIVE)})) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (getComputedStyle(el).visibility === "hidden") continue;
    if (r.height < 44 || r.width < 24) {
      smallTargets.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute("class") || "").slice(0, 40),
        label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 34),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
  }
  const fontSizes = {};
  for (const el of document.querySelectorAll("body *")) {
    if (!el.firstChild || el.firstChild.nodeType !== 3) continue;
    if (!(el.textContent || "").trim()) continue;
    const cs = getComputedStyle(el);
    const key = cs.fontSize + "/" + cs.fontWeight + "/" + cs.fontFamily.split(",")[0].replace(/["']/g, "");
    fontSizes[key] = (fontSizes[key] || 0) + 1;
  }
  return {
    overflow,
    spill: spill.slice(0, 12),
    spillCount: spill.length,
    smallTargets: smallTargets.slice(0, 12),
    smallTargetCount: smallTargets.length,
    typeScale: Object.entries(fontSizes).sort((a, b) => b[1] - a[1]),
    docHeight: Math.round(doc.scrollHeight),
  };
})()`;

const report = { base: BASE, out: OUT, generatedAt: new Date().toISOString(), pages: [] };

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      colorScheme: theme,
      reducedMotion: "no-preference",
    });
    await context.addInitScript(`try{localStorage.setItem("selene-theme",${JSON.stringify(theme)});localStorage.setItem("theme",${JSON.stringify(theme)})}catch(e){}`);
    // Keep the Astro dev toolbar out of every capture.
    await context.addInitScript(`document.addEventListener("DOMContentLoaded",()=>{const s=document.createElement("style");s.textContent="astro-dev-toolbar{display:none!important}";document.head.appendChild(s)})`);
    const page = await context.newPage();

    for (const route of ROUTES) {
      if (ONLY && !route.name.includes(ONLY)) continue;
      const messages = [];
      const onConsole = (m) => {
        if (m.type() === "error" || m.type() === "warning") messages.push(`${m.type()}: ${m.text().slice(0, 240)}`);
      };
      const onError = (e) => messages.push(`pageerror: ${String(e).slice(0, 240)}`);
      page.on("console", onConsole);
      page.on("pageerror", onError);

      const url = BASE + route.url;
      let status = null;
      try {
        const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
        status = res?.status() ?? null;
      } catch (err) {
        messages.push(`navigation: ${String(err).slice(0, 200)}`);
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        } catch {}
      }

      // Force the requested theme regardless of how the app persists it.
      await page.evaluate((t) => {
        const root = document.documentElement;
        root.classList.toggle("dark", t === "dark");
        root.dataset.theme = t;
        root.setAttribute("data-color-scheme", t);
      }, theme);
      await page.waitForTimeout(450);

      const metrics = await page.evaluate(probe);
      const file = path.join(OUT, `${route.name}-${vp.name}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: true, animations: "disabled" });

      report.pages.push({
        route: route.name,
        url: route.url,
        viewport: vp.name,
        theme,
        status,
        screenshot: file,
        ...metrics,
        messages: [...new Set(messages)].slice(0, 10),
      });

      page.off("console", onConsole);
      page.off("pageerror", onError);
      process.stdout.write(
        `${route.name.padEnd(15)} ${vp.name.padEnd(8)} ${theme.padEnd(6)} ` +
          `status=${status} overflow=${metrics.overflow}px spill=${metrics.spillCount} ` +
          `smallTargets=${metrics.smallTargetCount} msgs=${messages.length}\n`
      );
    }
    await context.close();
  }
}

await browser.close();
await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

const problems = report.pages.filter(
  (p) => p.overflow > 0 || p.spillCount > 0 || p.messages.length > 0 || (p.viewport === "mobile" && p.smallTargetCount > 0)
);
console.log(`\n${report.pages.length} captures -> ${OUT}`);
console.log(`${problems.length} captures with defects`);
for (const p of problems) {
  console.log(`  ! ${p.route} ${p.viewport} ${p.theme}: overflow=${p.overflow} spill=${p.spillCount} small=${p.smallTargetCount} msgs=${p.messages.length}`);
}
