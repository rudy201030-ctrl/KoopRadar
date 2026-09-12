# KoopRader production status

The production frontend is `index.html` + `app-production.js`.

Production rules:
- No demo products or invented prices.
- Product and offer data must come from the configured server-side API/feed.
- Affiliate credentials must remain server-side.
- The public frontend may use only the API response and approved product links.

Current API implementation:
- `supabase/functions/search/index.ts`
- `supabase/functions/product/index.ts`
- `supabase/functions/health/index.ts`

The remaining deployment dependency is configuration of the real production data source/API credentials on the server. No credentials are stored in this repository.
