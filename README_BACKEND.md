# KoopRader — production backend

## Architecture
- Frontend: static HTML/CSS/JavaScript on GitHub Pages.
- Database: PostgreSQL via Supabase.
- API: Supabase Edge Functions behind an `/api/*` routing layer.
- Ingestion: approved retailer feeds, affiliate feeds, or APIs whose terms permit the intended use.
- Updates: scheduled jobs refresh offers and append price history.

## API functions
- `supabase/functions/search/index.ts` — search, filtering and offer comparison.
- `supabase/functions/product/index.ts` — product details and current offers. Accepts both `/api/products/<id>` routing and `?id=<id>`.
- `supabase/functions/health/index.ts` — API health check.

## Required production setup
1. Create a Supabase project.
2. Run `backend.sql` in the Supabase SQL editor.
3. Deploy the three Edge Functions.
4. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-side secrets. Never expose the service-role key in browser code.
5. Configure an API gateway/rewrite for `/api/search`, `/api/products/<id>` and `/api/health`.
6. Configure the frontend API origin as `window.KOOPRADER_API_URL` in the deployment environment/configuration.
7. Connect approved retailer/affiliate feeds and credentials server-side.
8. Schedule ingestion and verify price, shipping, stock, product URL and `last_checked_at`.

## Data quality and safety
- Never invent live prices, stock, retailer URLs or review scores.
- Compare using total cost: product price + shipping.
- Reject invalid/negative prices and malformed URLs.
- Prefer EAN as the canonical product identifier when supplied.
- Record price changes in `price_history`.
- Show freshness timestamps to users.
- Respect feed/API terms, affiliate requirements, rate limits and applicable crawling rules.

## Frontend modes
**Production mode:** when `KOOPRADER_API_URL` is configured and the API returns data, the site displays API products and current offers.

**Demo fallback:** when the API is unavailable or unconfigured, the site uses a small local demonstration dataset. Demo values must not be represented as live retailer prices.

## Go-live checklist
- [ ] Supabase project created
- [ ] `backend.sql` applied
- [ ] Edge Functions deployed
- [ ] `/api/*` routing and CORS configured
- [ ] Approved retailer/affiliate feeds connected
- [ ] Scheduled ingestion running
- [ ] Live search and product-detail API tests pass
- [ ] GitHub Pages custom domain verified
- [ ] DNS and HTTPS verified
- [ ] Mobile/accessibility smoke test passed
