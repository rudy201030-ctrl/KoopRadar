import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const pathId = url.pathname.split("/").filter(Boolean).pop();
    const id = url.searchParams.get("id") ?? (pathId && pathId !== "product" ? pathId : null);
    if (!id || id.length > 160) return json({ error: "Missing product id" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "API configuration unavailable" }, 503);

    const db = createClient(supabaseUrl, serviceKey);
    const { data, error } = await db
      .from("products")
      .select("id,ean,sku,brand,name,category,image_url,description,active,offers(id,price,old_price,shipping_cost,stock_status,product_url,image_url,last_checked_at,active,shops(id,name,domain,active))")
      .eq("id", id)
      .eq("active", true)
      .single();

    if (error || !data) return json({ error: "Product not found" }, 404);

    const offers = (data.offers ?? [])
      .filter((o: any) => o.active === true && o.product_url && o.shops?.active !== false)
      .map((o: any) => ({
        ...o,
        shop_name: o.shops?.name ?? "Winkel",
        total_price: Number(o.price) + Number(o.shipping_cost ?? 0),
      }))
      .filter((o: any) => Number.isFinite(o.total_price) && o.total_price >= 0)
      .sort((a: any, b: any) => a.total_price - b.total_price);

    return json({
      ...data,
      offers,
      lowest_total_price: offers[0]?.total_price ?? null,
      shop_count: offers.length,
      last_checked_at: offers.reduce(
        (latest: string | null, o: any) => !latest || o.last_checked_at > latest ? o.last_checked_at : latest,
        null,
      ),
    });
  } catch {
    return json({ error: "Product service temporarily unavailable" }, 500);
  }
});
