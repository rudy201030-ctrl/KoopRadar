# KoopRader — productie-backend

## Architectuur
- Frontend: statische HTML/CSS/JavaScript op GitHub Pages of de bestaande hosting.
- Database: PostgreSQL via Supabase wanneer de API daarop wordt aangesloten.
- API: `/api/search`, `/api/products/<id>` en `/api/health` via de ingestelde API-laag.
- Ingestion: goedgekeurde retailer-, affiliate- en productfeeds, waaronder de bestaande Awin-feedconfiguratie wanneer die server-side beschikbaar is.
- Updates: geplande imports vernieuwen aanbiedingen en bewaren prijswijzigingen.

## API-functies
- `supabase/functions/search/index.ts` — zoeken, filteren en aanbiedingen vergelijken.
- `supabase/functions/product/index.ts` — productdetails en actuele aanbiedingen.
- `supabase/functions/health/index.ts` — API health check.

## Productie-eisen
1. Feed- en affiliategegevens blijven uitsluitend server-side.
2. Gebruik alleen echte, actuele feedproducten; nooit verzonnen prijzen of winkels.
3. Normaliseer minimaal EAN, naam, merk, categorie, prijs, verzending, voorraad, product-URL, afbeelding en controletijdstip.
4. Vergelijk op totale kosten: productprijs + verzending.
5. Valideer prijzen, identifiers en URL's vóór publicatie.
6. Bewaar prijswijzigingen in `price_history`.
7. Toon de actualiteit van de prijs aan de gebruiker.
8. Respecteer feedvoorwaarden, affiliatevoorwaarden en rate limits.

## Beveiliging
- Geen Awin-feed-URL, API-key, affiliate-secret of Supabase service-role key in browsercode, GitHub of publieke API-responses.
- Imports zijn atomair: eerst downloaden, parseren en valideren; pas daarna de actieve productdata vervangen.
- Bij een mislukte import blijft de laatst geldige productdataset behouden.

## Frontend
De productie-frontend toont uitsluitend data die via de productie-API beschikbaar is. Als de feed/API niet beschikbaar is, toont KoopRader een duidelijke tijdelijke melding en géén demo-producten of nepprijzen.

## Go-live checklist
- [x] Productie frontend aangesloten op API-routes
- [x] Zoeken, categorieën en sortering voorbereid
- [x] Productdetail en winkel-links voorbereid
- [x] SEO canonical, robots en sitemap aanwezig
- [x] Geen demo-fallback in productiefrontend
- [ ] Server-side Awin-feed/import daadwerkelijk aangesloten op de productieomgeving
- [ ] API-routing op de productiehost actief
- [ ] Automatische feed-import/cron actief
- [ ] Live product-, prijs- en affiliate-click tests uitvoeren
- [ ] DNS/HTTPS definitief verifiëren
- [ ] Mobiele en toegankelijkheidstest uitvoeren
