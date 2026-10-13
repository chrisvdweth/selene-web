import provenance from "../../src/data/notebook-provenance.json";

type Context = { params: { notebook?: string }; request: Request };

export const onRequestGet = async ({ params }: Context) => {
  const standalone = params.notebook ? decodeURIComponent(params.notebook) : "";
  const mapped = provenance.entries.some((entry) => entry.standalone === standalone);
  if (!mapped) return new Response("Standalone notebook not found.", { status: 404 });

  const url = `https://raw.githubusercontent.com/${provenance.repository}/${provenance.commit}/notebooks/standalone/${encodeURIComponent(standalone)}`;
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) return new Response("Standalone notebook is temporarily unavailable.", { status: 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/x-ipynb+json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${standalone.replaceAll('"', "")}"`,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
