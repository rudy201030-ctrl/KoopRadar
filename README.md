# KoopRader.nl

De slimme prijsvergelijker van Nederland. Vergelijk actuele prijzen en vind snel de beste deal.

## Productieprincipes

- Alleen echte, actuele product- en prijsdata; geen demo-producten of nepprijzen.
- Affiliate links en retailerfeeds blijven server-side en worden nooit als geheim in de frontend gezet.
- Zoekresultaten tonen alleen actieve producten met minimaal één actuele aanbieding.
- Prijzen worden inclusief bekende verzendkosten genormaliseerd voor een eerlijke vergelijking.
- Productdetailpagina's tonen beschikbare aanbiedingen en leiden via de bestaande affiliate productlink naar de winkel.

## Architectuur

- Frontend: statische HTML/CSS/JavaScript.
- API: server-side endpoints / Supabase Edge Functions.
- Database: PostgreSQL via Supabase.
- Ingestion: toegestane retailer- en affiliatefeeds, met caching en prijscontrole.
- Geheimen: uitsluitend server-side environment variables.
