interface AdminEnv { ADMIN_PASSWORD?: string }
interface AdminContext { request: Request; env: AdminEnv; next: () => Promise<Response> }

const unauthorized = () => new Response("Admin sign-in required.", {
  status: 401,
  headers: { "WWW-Authenticate": 'Basic realm="SELENE admin", charset="UTF-8"', "Cache-Control": "no-store" },
});

export const onRequest = async (context: AdminContext) => {
  const password = context.env.ADMIN_PASSWORD;
  if (!password) return new Response("Admin access is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const authorization = context.request.headers.get("Authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorized();
  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0 || decoded.slice(separator + 1) !== password) return unauthorized();
  } catch { return unauthorized(); }
  const response = await context.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};
