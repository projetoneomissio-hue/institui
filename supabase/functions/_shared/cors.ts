const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  "https://institui.vercel.app,https://sistema.neomissio.com.br,http://localhost:5173"
).split(",").map((o) => o.trim());

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
