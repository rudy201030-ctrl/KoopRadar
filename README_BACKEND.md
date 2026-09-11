# KoopRader — backend architecture

## Production architecture
- Frontend: static HTML/CSS/JavaScript
- Database: PostgreSQL via Supabase
- API: serverless endpoints / Edge Functions
- Price ingestion: retailer feeds and approved APIs
- Scheduled updates: price refresh jobs
- Security: secrets remain server-side; no API keys in frontend

## Data model
- products: canonical product identity, brand, category, identifiers
- shops: retailer identity and affiliate/deep-link metadata
- offers: current price, previous price, shipping, stock, URL, updated_at
- price_history: historical price snapshots

## Important
The current repository is a complete frontend/MVP shell. Real retailer prices must only be connected through permitted feeds/APIs and their terms. Never scrape a retailer in violation of its terms or robots policy.
