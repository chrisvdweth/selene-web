import type { APIRoute } from "astro"; export const GET: APIRoute=()=>new Response("User-agent: *\nAllow: /\nSitemap: https://selene.example.org/sitemap-index.xml\n");
