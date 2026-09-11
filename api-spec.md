# KoopRader API

## Public endpoints
`GET /api/search?q=<term>&category=<category>&sort=<price|saving|shops>`

`GET /api/products/<id>`

`GET /api/health`

## Search response
Return canonical product information plus normalized offers. Sort by total price (price + shipping) by default. Include `last_checked_at` so freshness is visible to users.

## Server-side ingestion
Retailer credentials and affiliate keys must never be exposed in browser code. Each source adapter should normalize to: product identifier (EAN when available), product name, shop, price, shipping, stock, product URL, image URL, checked timestamp.

## Production rules
- Use official retailer feeds/APIs/affiliate networks or sources whose terms permit collection.
- Cache results and avoid unnecessary retailer requests.
- Validate prices and identifiers before publishing.
- Record every price change in `price_history`.
- Show a clear timestamp for price freshness.
