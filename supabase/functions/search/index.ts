import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&").replace(/,/g, " ");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
    const category = (url.searchParams.get("category") ?? "").trim().slice(0, 120);
    const requestedSort = url.searchParams.get("sort") ?? "price";
    const sort = ["price", "saving", "shops", "name"].includes(requestedSort) ? requestedSort : "price";
    const parsedLimit = Number(url.searchParams.get("limit") ?? 24);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100) : 24;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "API configuration unavailable" }, 503);

    const supabase = createClient(supabaseUrl, serviceKey);
    let query = supabase
      .from("products")
      .select("id,ean,sku,brand,name,category,image_url,description,offers(id,price,old_price,shipping_cost,stock_status,product_url,image_url,last_checked_at,active,shops(id,name,domain,active))")
      .eq("active", true)
      .limit(limit);

    if (q) {
      const safe = escapeLike(q);
      query = query.or(`name.ilike.%${safe}%,brand.ilike.%${safe}%,ean.eq.${q}`);
    }
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;

    const products = (data ?? []).map((p: any) => {
      const offers = (p.offers ?? [])
        .filter((o: any) => o.active === true && o.product_url && o.shops?.active !== false)
        .map((o: any) => ({ ...o, shop_name: o.shops?.name ?? "Winkel", total_price: Number(o.price) + Number(o.shipping_cost ?? 0) }))
        .filter((o: any) => Number.isFinite(o.total_price) && o.total_price >= 0)
        .sort((a: any, b: any) => a.total_price - b.total_price);
      const lowest = offers[0]?.total_price ?? null;
      const bestSaving = offers.reduce((max: number, o: any) => Math.max(max, Number(o.old_price ?? 0) - o.total_price), 0);
      const lastChecked = offers.reduce((latest: string | null, o: any) => !latest || o.last_checked_at > latest ? o.last_checked_at : latest, null);
      return { ...p, offers, lowest_total_price: lowest, shop_count: offers.length, saving: Math.max(0, bestSaving), last_checked_at: lastChecked };
    }).filter((p: any) => p.offers.length);

    if (sort === "saving") products.sort((a: any, b: any) => b.saving - a.saving);
    else if (sort === "shops") products.sort((a: any, b: any) => b.shop_count - a.shop_count || a.lowest_total_price - b.lowest_total_price);
    else if (sort === "name") products.sort((a: any, b: any) => a.name.localeCompare(b.name, "nl"));
    else products.sort((a: any, b: any) => a.lowest_total_price - b.lowest_total_price);

    return json({ query: q, category, sort, count: products.length, products, last_checked_at: products.reduce((latest: string | null, p: any) => !latest || p.last_checked_at > latest ? p.last_checked_at : latest, null) });
  } catch {
    return json({ error: "Search service temporarily unavailable" }, 500);
  }
});
