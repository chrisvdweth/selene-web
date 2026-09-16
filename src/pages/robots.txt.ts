import type { APIRoute } from "astro";
import { SITE } from "../config/site";
export const GET: APIRoute = () => new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", SITE.url)}\n`);
