import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const category = (url.searchParams.get("category") ?? "").trim();
    const sort = url.searchParams.get("sort") ?? "price";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 24), 1), 100);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let query = supabase.from("products").select("id,ean,sku,brand,name,category,image_url,description,offers(id,price,old_price,shipping_cost,stock_status,product_url,image_url,last_checked_at,shops(id,name,domain))").eq("active", true).limit(limit);
    if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,ean.eq.${q}`);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;

    const products = (data ?? []).map((p: any) => {
      const offers = (p.offers ?? []).filter((o: any) => o.product_url).map((o: any) => ({ ...o, total_price: Number(o.price) + Number(o.shipping_cost ?? 0) })).sort((a: any, b: any) => a.total_price - b.total_price);
      const lowest = offers[0]?.total_price ?? null;
      return { ...p, offers, lowest_total_price: lowest, shop_count: offers.length, saving: offers.length && p.offers[0]?.old_price ? Math.max(0, Number(p.offers[0].old_price) - lowest) : 0 };
    }).filter((p: any) => p.offers.length);

    if (sort === "saving") products.sort((a: any, b: any) => b.saving - a.saving);
    else if (sort === "name") products.sort((a: any, b: any) => a.name.localeCompare(b.name));
    else products.sort((a: any, b: any) => a.lowest_total_price - b.lowest_total_price);

    return json({ query: q, category, sort, count: products.length, products, last_checked_at: new Date().toISOString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Search failed" }, 500);
  }
});
