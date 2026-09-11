import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  return new Response(JSON.stringify({ ok: true, service: "kooprader-api", timestamp: new Date().toISOString() }), { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } });
});
