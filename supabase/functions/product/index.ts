import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const pathId = url.pathname.split("/").filter(Boolean).pop();
    const id = url.searchParams.get("id") ?? (pathId && pathId !== "product" ? pathId : null);
    if (!id) return json({ error: "Missing product id" }, 400);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await db
      .from("products")
      .select("id,ean,sku,brand,name,category,image_url,description,offers(id,price,old_price,shipping_cost,stock_status,product_url,image_url,last_checked_at,shops(id,name,domain))")
      .eq("id", id)
      .eq("active", true)
      .single();
    if (error) return json({ error: "Product not found" }, 404);

    const offers = (data.offers ?? [])
      .filter((o: any) => o.active !== false && o.product_url)
      .map((o: any) => ({ ...o, total_price: Number(o.price) + Number(o.shipping_cost ?? 0) }))
      .sort((a: any, b: any) => a.total_price - b.total_price);

    return json({ ...data, offers, lowest_total_price: offers[0]?.total_price ?? null, shop_count: offers.length, last_checked_at: offers.reduce((latest: string | null, o: any) => !latest || o.last_checked_at > latest ? o.last_checked_at : latest, null) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Product not found" }, 500);
  }
});
