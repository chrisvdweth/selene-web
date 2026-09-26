import type { APIRoute } from "astro";
import { SITE } from "../config/site";
import { topics } from "../lib/topics";
export const GET: APIRoute = () => new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/topics", "/paths", "/graph", "/about", ...topics.map((topic) => `/topics/${topic.id}`)].map((path) => `<url><loc>${new URL(path, SITE.url)}</loc></url>`).join("")}</urlset>`, { headers: { "Content-Type": "application/xml" } });
