# KoopRader — Awin productie-koppeling

KoopRader gebruikt Awin uitsluitend server-side. Zet nooit feed-API keys, tokens of Supabase service-role keys in frontendcode.

## Benodigde serverconfiguratie

De productie-importer moet deze server-side variabelen krijgen:

- `AWIN_FEED_URL` — de echte feed-download-URL uit Awin Create-a-Feed of de beschikbare Enhanced Feed API.
- `AWIN_FEED_TOKEN` — alleen indien de gekozen Awin-feed een Bearer-token vereist.
- `AWIN_SHOP_NAME` — winkelnaam wanneer de feed die niet zelf bevat.
- `AWIN_SHOP_DOMAIN` — winkeldomein.
- `AWIN_IMPORT_SECRET` — eigen geheim waarmee alleen de geplande importer mag worden gestart.
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Belangrijk

Gebruik alleen een echte feed-URL en echte credentials uit het Awin-account. Er worden in dit repository geen voorbeeldsleutels of verzonnen feed-URL's geplaatst.

Awin biedt productfeeds als CSV en daarnaast Enhanced/Google feeds als JSONL. De Awin-documentatie raadt CSV aan wanneer mogelijk. De feed bevat onder andere product-ID, productnaam, prijs, productlink, afbeelding, merk en EAN/GTIN.

Voor KoopRader moet een offer alleen publiek worden wanneer er een geldige product-URL, prijs en identifier aanwezig zijn. Gebruik bij voorkeur de Awin deep link uit een Legacy-feed voor affiliate-outbound links. Bij een Enhanced-feed moet eerst de correcte affiliate-linkmethode voor het aangesloten programma worden geconfigureerd; gebruik nooit zomaar een niet-tracked productlink als affiliate-link.

## Go-live volgorde

1. Kies in Awin een echte Nederlandse feed die KoopRader mag gebruiken.
2. Kopieer de echte feed-downloadconfiguratie naar de serveromgeving.
3. Voer `backend.sql` uit in Supabase.
4. Deploy de API-functies onder `supabase/functions`.
5. Configureer de server-side secrets hierboven.
6. Laat de importer eerst een kleine validatietest uitvoeren.
7. Controleer productaantallen, prijzen, links en afbeeldingen.
8. Activeer daarna de geplande import.
9. Test zoeken, productdetail en affiliate-doorklik op `kooprader.nl`.

Nooit credentials committen naar GitHub.
