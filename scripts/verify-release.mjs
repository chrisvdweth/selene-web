import { access, readFile } from "node:fs/promises";
const site = process.env.SITE_URL || process.env.CF_PAGES_URL;
if (!site?.startsWith("https://")) throw new Error("verify:release requires an HTTPS SITE_URL or CF_PAGES_URL");
for (const path of ["dist/_headers", "dist/_redirects", "dist/sitemap.xml", "dist/404.html", "dist/robots.txt"]) await access(path);
const [robots, home] = await Promise.all([readFile("dist/robots.txt", "utf8"), readFile("dist/index.html", "utf8")]);
if (robots.includes("example.org") || home.includes("example.org")) throw new Error("Release contains a placeholder origin");
console.log(`Verified release output for ${site}.`);
