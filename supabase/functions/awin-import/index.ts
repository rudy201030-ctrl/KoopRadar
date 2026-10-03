import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const text = (v: unknown): string => String(v ?? "").trim();

function normalizeEan(value: unknown): string {
  return text(value).replace(/\D/g, "");
}

function numberValue(value: unknown): number | null {
  const raw = text(value).replace(/\s/g, "").replace(/,/g, ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

function csvRows(csv: string): Record<string, string>[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => row[h] = values[i] ?? "");
    return row;
  });
}

function first(row: Record<string, string>, names: string[]): string {
  for (const name of names) {
    if (text(row[name]) !== "") return text(row[name]);
  }
  return "";
}

function authOk(req: Request): boolean {
  const expected = Deno.env.get("AWIN_IMPORT_SECRET");
  if (!expected) return false;
  const supplied = req.headers.get("x-import-secret") ?? "";
  return supplied === expected;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  if (!authOk(req)) return json({ error: "Unauthorized" }, 401);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const feedUrl = Deno.env.get("AWIN_FEED_URL");
    const shopName = text(Deno.env.get("AWIN_SHOP_NAME"));
    const shopDomain = text(Deno.env.get("AWIN_SHOP_DOMAIN"));
    const feedToken = text(Deno.env.get("AWIN_FEED_TOKEN"));

    if (!supabaseUrl || !serviceKey || !feedUrl || !shopName) {
      return json({ error: "Importer configuration incomplete" }, 503);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const headers: HeadersInit = {};
    if (feedToken) headers.Authorization = `Bearer ${feedToken}`;

    const feedResponse = await fetch(feedUrl, { headers });
    if (!feedResponse.ok) {
      return json({ error: `Awin feed returned HTTP ${feedResponse.status}` }, 502);
    }

    const csv = await feedResponse.text();
    const rows = csvRows(csv);
    const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";

    const stats = { rows: rows.length, valid: 0, skipped: 0, products: 0, offers: 0 };
    const preview: Record<string, unknown>[] = [];

    if (dryRun) {
      for (const row of rows.slice(0, 25)) {
        const ean = normalizeEan(first(row, ["ean", "EAN", "gtin", "GTIN"]));
        const name = first(row, ["product_name", "Product Name", "name", "Name"]);
        const price = numberValue(first(row, ["price", "Price", "search_price", "Search Price"]));
        const productUrl = first(row, ["product_url", "Product URL", "url", "URL", "deep_link"]);
        const imageUrl = first(row, ["image_url", "Image URL", "aw_image_url", "image"]);
        const brand = first(row, ["brand", "Brand"]);
        const valid = Boolean(ean && name && price !== null && price >= 0 && productUrl);
        if (valid) stats.valid++; else stats.skipped++;
        preview.push({ ean, name, price, productUrl, imageUrl, brand, valid });
      }
      return json({ dry_run: true, ...stats, preview });
    }

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .upsert({ name: shopName, domain: shopDomain || null, active: true }, { onConflict: "name" })
      .select("id,name")
      .single();
    if (shopError) throw shopError;

    for (const row of rows) {
      const ean = normalizeEan(first(row, ["ean", "EAN", "gtin", "GTIN"]));
      const name = first(row, ["product_name", "Product Name", "name", "Name"]);
      const price = numberValue(first(row, ["price", "Price", "search_price", "Search Price"]));
      const productUrl = first(row, ["product_url", "Product URL", "url", "URL", "deep_link"]);
      const imageUrl = first(row, ["image_url", "Image URL", "aw_image_url", "image"]);
      const brand = first(row, ["brand", "Brand"]);
      const sku = first(row, ["sku", "SKU", "merchant_product_id", "Merchant Product ID"]);
      const category = first(row, ["category", "Category", "product_type", "Product Type"]);

      if (!ean || !name || price === null || price < 0 || !productUrl) {
        stats.skipped++;
        continue;
      }
      stats.valid++;

      const { data: product, error: productError } = await supabase
        .from("products")
        .upsert({
          ean,
          sku: sku || null,
          brand: brand || null,
          name,
          category: category || null,
          image_url: imageUrl || null,
          active: true,
        }, { onConflict: "ean" })
        .select("id")
        .single();
      if (productError) throw productError;

      const { error: offerError } = await supabase
        .from("offers")
        .upsert({
          product_id: product.id,
          shop_id: shop.id,
          price,
          shipping_cost: numberValue(first(row, ["shipping_cost", "Shipping Cost", "delivery_cost"])) ?? 0,
          stock_status: first(row, ["stock_status", "Stock Status", "in_stock", "availability"]) || null,
          product_url: productUrl,
          image_url: imageUrl || null,
          active: true,
        }, { onConflict: "product_id,shop_id" });
      if (offerError) throw offerError;

      stats.products++;
      stats.offers++;
    }

    return json({ ok: true, shop: shop.name, ...stats });
  } catch (error) {
    console.error(error);
    return json({ error: "Import failed" }, 500);
  }
});
