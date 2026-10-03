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
  let raw = text(value).replace(/\s/g, "");
  if (!raw) return null;

  // Awin Enhanced/Google feeds can contain values such as "15.99 EUR".
  // Legacy CSV feeds can use either 15.99 or 15,99 and sometimes 1.234,56.
  raw = raw.replace(/[^0-9,.-]/g, "");
  if (!raw) return null;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  if (lastComma > lastDot) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    raw = raw.replace(/,/g, "");
  } else {
    raw = raw.replace(/,/g, ".");
  }

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function splitCsvLine(line: string, delimiter = ","): string[] {
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
    } else if (ch === delimiter && !quoted) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }

  out.push(field);
  return out;
}

function detectCsvDelimiter(header: string): string {
  const candidates = [",", ";", "|", "\t"];
  return candidates.reduce((best, candidate) =>
    header.split(candidate).length > header.split(best).length ? candidate : best
  , ",");
}

function csvRows(csv: string): Record<string, unknown>[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (!lines.length) return [];

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => row[h] = values[i] ?? "");
    return row;
  });
}

function jsonlRows(feed: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const lines = feed.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");

  for (const line of lines) {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error("Invalid JSONL line in Awin feed");
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const object = value as Record<string, unknown>;

    // Awin documents that an error object can appear as the final JSONL line.
    if ("error" in object) {
      throw new Error(`Awin feed error: ${text(object.message) || text(object.error)}`);
    }

    rows.push(object);
  }

  return rows;
}

function first(row: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    if (text(row[name]) !== "") return text(row[name]);
  }
  return "";
}

function deepFirst(value: unknown, names: string[]): string {
  if (!value || typeof value !== "object") return "";
  const object = value as Record<string, unknown>;

  const direct = first(object, names);
  if (direct) return direct;

  for (const child of Object.values(object)) {
    const found = deepFirst(child, names);
    if (found) return found;
  }
  return "";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function authOk(req: Request): boolean {
  const expected = Deno.env.get("AWIN_IMPORT_SECRET");
  if (!expected) return false;
  const supplied = req.headers.get("x-import-secret") ?? "";
  return supplied === expected;
}

function mapRow(row: Record<string, unknown>) {
  const enhanced = Object.keys(row).some((key) => key.startsWith("product_"));
  const ean = normalizeEan(enhanced
    ? deepFirst(row, ["gtin", "ean", "product_GTIN"])
    : first(row, ["ean", "EAN", "gtin", "GTIN", "product_GTIN"]));

  const name = enhanced
    ? deepFirst(row, ["title", "name", "product_name"])
    : first(row, ["product_name", "Product Name", "name", "Name"]);

  const productUrl = enhanced
    ? deepFirst(row, ["aw_deep_link", "deep_link", "link", "product_url", "merchant_deep_link"])
    : first(row, ["aw_deep_link", "deep_link", "product_url", "Product URL", "url", "URL", "merchant_deep_link"]);

  const imageUrl = enhanced
    ? deepFirst(row, ["image_link", "image_url", "aw_image_url", "merchant_image_url", "image"])
    : first(row, ["aw_image_url", "image_url", "Image URL", "merchant_image_url", "image"]);

  const brand = enhanced
    ? deepFirst(row, ["brand", "brand_name", "Brand"])
    : first(row, ["brand_name", "brand", "Brand"]);

  const sku = enhanced
    ? deepFirst(row, ["mpn", "sku", "merchant_product_id", "id"])
    : first(row, ["merchant_product_id", "Merchant Product ID", "sku", "SKU", "aw_product_id"]);

  const category = enhanced
    ? deepFirst(row, ["product_type", "google_product_category", "category", "Category"])
    : first(row, ["product_type", "Product Type", "category", "Category", "merchant_category", "category_name"]);

  const priceText = enhanced
    ? deepFirst(row, ["sale_price", "price", "search_price", "store_price"])
    : first(row, ["search_price", "Search Price", "price", "Price", "store_price"]);

  const oldPriceText = enhanced
    ? deepFirst(row, ["price", "rrp_price", "product_price_old", "old_price"])
    : first(row, ["product_price_old", "rrp_price", "old_price", "Old Price"]);

  const shippingText = enhanced
    ? deepFirst(row, ["shipping_cost", "delivery_cost", "shipping_price"])
    : first(row, ["delivery_cost", "Delivery Cost", "shipping_cost", "Shipping Cost", "delivery_price"]);

  const stockStatus = enhanced
    ? deepFirst(row, ["availability", "stock_status"])
    : first(row, ["stock_status", "Stock Status", "availability", "in_stock"]);

  const price = numberValue(priceText);
  const oldPrice = numberValue(oldPriceText);
  const shippingCost = numberValue(shippingText) ?? 0;

  return {
    ean,
    name,
    price,
    oldPrice: oldPrice !== null && price !== null && oldPrice >= price ? oldPrice : null,
    shippingCost,
    stockStatus: stockStatus || null,
    productUrl,
    imageUrl,
    brand,
    sku,
    category,
  };
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

    const feed = await feedResponse.text();
    const contentType = feedResponse.headers.get("content-type")?.toLowerCase() ?? "";
    const trimmed = feed.trimStart();
    const isJsonl = feedUrl.toLowerCase().includes(".jsonl") ||
      contentType.includes("json") ||
      trimmed.startsWith("{");

    const rows = isJsonl ? jsonlRows(feed) : csvRows(feed);
    const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";
    const stats = { format: isJsonl ? "jsonl" : "csv", rows: rows.length, valid: 0, skipped: 0, products: 0, offers: 0 };
    const preview: Record<string, unknown>[] = [];

    if (dryRun) {
      for (const row of rows.slice(0, 25)) {
        const mapped = mapRow(row);
        const valid = Boolean(mapped.ean && mapped.name && mapped.price !== null && mapped.price >= 0 && isHttpUrl(mapped.productUrl));
        if (valid) stats.valid++; else stats.skipped++;
        preview.push({ ...mapped, valid });
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
      const mapped = mapRow(row);

      if (!mapped.ean || !mapped.name || mapped.price === null || mapped.price < 0 || !isHttpUrl(mapped.productUrl)) {
        stats.skipped++;
        continue;
      }
      stats.valid++;

      const { data: product, error: productError } = await supabase
        .from("products")
        .upsert({
          ean: mapped.ean,
          sku: mapped.sku || null,
          brand: mapped.brand || null,
          name: mapped.name,
          category: mapped.category || null,
          image_url: mapped.imageUrl || null,
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
          price: mapped.price,
          old_price: mapped.oldPrice,
          shipping_cost: mapped.shippingCost,
          stock_status: mapped.stockStatus,
          product_url: mapped.productUrl,
          image_url: mapped.imageUrl || null,
          active: true,
        }, { onConflict: "product_id,shop_id" });
      if (offerError) throw offerError;

      stats.products++;
      stats.offers++;
    }

    return json({ ok: true, shop: shop.name, ...stats });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Import failed" }, 500);
  }
});
