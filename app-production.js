(() => {
  "use strict";
  const grid = document.querySelector("#dealGrid");
  const count = document.querySelector("#resultCount");
  const empty = document.querySelector("#empty");
  const input = document.querySelector("#searchInput");
  const form = document.querySelector("#searchForm");
  const sort = document.querySelector("#sortSelect");
  const money = n => Number.isFinite(Number(n)) ? new Intl.NumberFormat("nl-NL", {style:"currency",currency:"EUR"}).format(Number(n)) : "—";
  const esc = s => String(s ?? "").replace(/[&<>\"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
  let products = [];
  const base = String(window.KOOPRADER_API_URL || "").replace(/\/$/, "");
  const normalize = p => ({...p, id:p.id ?? p.ean ?? p.sku ?? p.slug, name:p.name || "Onbekend product", brand:p.brand || "", category:p.category || "", image_url:p.image_url || p.image || "", price:Number(p.lowest_total_price ?? p.price), oldPrice:Number(p.old_price ?? p.oldPrice), shops:Number(p.shop_count ?? p.shops ?? (p.offers?.length || 0)), offers:Array.isArray(p.offers) ? p.offers : []});
  const sortProducts = (a, mode) => [...a].sort((x,y) => mode === "name" ? String(x.name).localeCompare(String(y.name),"nl") : mode === "saving" ? ((y.oldPrice-y.price)-(x.oldPrice-x.price)) : mode === "shops" ? y.shops-x.shops : x.price-y.price);
  const card = p => `<article class="deal-card"><div class="deal-visual">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="deal-placeholder">${esc(p.brand || "KoopRader")}</div>`}</div><div class="deal-body"><span class="badge">Actuele feed</span><h3>${esc(p.name)}</h3><div class="shop">${esc(p.brand)}${p.category ? ` · ${esc(p.category)}` : ""}${p.shops ? ` · ${esc(p.shops)} winkels` : ""}</div><div class="prices"><strong>${money(p.price)}</strong>${p.oldPrice > p.price ? `<del>${money(p.oldPrice)}</del>` : ""}</div><div class="saving">${p.oldPrice > p.price ? `Bespaar ${money(p.oldPrice-p.price)}` : "Actuele prijs"}</div><button class="deal-btn" data-id="${esc(p.id)}">Bekijk prijsvergelijking <span>→</span></button></div></article>`;
  function render(list){ if(!grid)return; grid.innerHTML=list.map(card).join(""); if(count)count.textContent=`${list.length} ${list.length===1?"resultaat":"resultaten"}`; if(empty)empty.hidden=list.length!==0; }
  async function get(path){const r=await fetch(base+path,{headers:{Accept:"application/json"},cache:"no-store"});if(!r.ok)throw Error(r.status);return r.json();}
  async function search(q=""){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">Actuele producten laden…</div>';const p=new URLSearchParams({limit:"60"});if(q)p.set("q",q);if(sort?.value)p.set("sort",sort.value);for(const path of [`/api/search?${p}`,`/api/search.php?${p}`]){try{const d=await get(path);const list=Array.isArray(d)?d:d.products;if(Array.isArray(list)){products=list.map(normalize).filter(x=>x.name&&Number.isFinite(x.price));render(sortProducts(products,sort?.value||"price"));return;}}catch(e){}}products=[];if(count)count.textContent="0 resultaten";if(empty)empty.hidden=true;grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><strong>Actuele productdata is tijdelijk niet beschikbaar.</strong><p>KoopRader toont bewust geen nepprijzen of demo-producten.</p></div>';}
  document.addEventListener("DOMContentLoaded", async () => { const q=new URLSearchParams(location.search).get("q")||""; if(input)input.value=q; await search(q); form?.addEventListener("submit",async e=>{e.preventDefault();const q=input?.value.trim()||"";history.replaceState(null,"",q?`?q=${encodeURIComponent(q)}`:location.pathname);await search(q);}); sort?.addEventListener("change",()=>render(sortProducts(products,sort.value))); });
})();