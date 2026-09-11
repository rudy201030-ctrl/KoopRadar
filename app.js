const DEALS = [
  {id:1,name:'Philips Airfryer XL 6,2L',category:'Keuken',brand:'Philips',price:79.95,oldPrice:99.95,shop:'Voorbeeldshop',rating:4.7,tag:'Beste prijs',query:'airfryer'},
  {id:2,name:'Sony WH-1000XM5 draadloze koptelefoon',category:'Elektronica',brand:'Sony',price:249.00,oldPrice:319.00,shop:'Voorbeeldshop',rating:4.8,tag:'Beste deal',query:'koptelefoon'},
  {id:3,name:'Samsung Galaxy A56 5G 128GB',category:'Smartphones',brand:'Samsung',price:349.00,oldPrice:429.00,shop:'Voorbeeldshop',rating:4.6,tag:'Goedkoopste',query:'smartphone'},
  {id:4,name:'LG 55 inch 4K Smart TV',category:'Televisies',brand:'LG',price:449.00,oldPrice:599.00,shop:'Voorbeeldshop',rating:4.5,tag:'Beste deal',query:'televisie'},
  {id:5,name:'LEGO Technic auto',category:'Speelgoed',brand:'LEGO',price:54.99,oldPrice:69.99,shop:'Voorbeeldshop',rating:4.9,tag:'Beste prijs',query:'lego speelgoed'},
  {id:6,name:'Bosch accuboormachine 18V',category:'Doe-het-zelf',brand:'Bosch',price:129.00,oldPrice:159.00,shop:'Voorbeeldshop',rating:4.7,tag:'Goedkoopste',query:'boormachine'}
];
const CATEGORIES=[['📱','Elektronica'],['🏠','Wonen'],['🍳','Keuken'],['📺','Televisies'],['🎮','Gaming'],['🧸','Speelgoed'],['👟','Mode'],['🔧','Doe-het-zelf']];
const fmt=n=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(n);
const discount=d=>Math.round((1-d.price/d.oldPrice)*100);
function card(d){return `<article class="deal-card"><div class="deal-visual">${d.brand}</div><div class="deal-body"><span class="badge">${d.tag}</span><h3>${d.name}</h3><div class="shop">${d.shop} · ★ ${d.rating}</div><div class="prices"><strong>${fmt(d.price)}</strong><del>${fmt(d.oldPrice)}</del></div><div class="saving">Bespaar ${fmt(d.oldPrice-d.price)} · -${discount(d)}%</div><button class="deal-btn" data-id="${d.id}">Bekijk deal <span>→</span></button></div></article>`}
function render(list=DEALS){document.querySelector('#dealGrid').innerHTML=list.map(card).join('');document.querySelector('#resultCount').textContent=list.length?`${list.length} resultaten`:'Geen resultaten';document.querySelector('#empty').hidden=!!list.length;}
function search(q){q=q.trim().toLowerCase();if(!q)return render();render(DEALS.filter(d=>(d.name+' '+d.category+' '+d.brand+' '+d.query).toLowerCase().includes(q)));document.querySelector('#resultaten').scrollIntoView({behavior:'smooth'});}
document.addEventListener('click',e=>{const b=e.target.closest('.deal-btn');if(b){const d=DEALS.find(x=>x.id==b.dataset.id);alert(`Deal voor ${d.name}\n\nIn de volledige versie wordt hier de winkelpagina geopend.`)}});
document.addEventListener('DOMContentLoaded',()=>{render();document.querySelector('#searchForm').addEventListener('submit',e=>{e.preventDefault();search(document.querySelector('#searchInput').value)});document.querySelectorAll('[data-search]').forEach(x=>x.addEventListener('click',()=>{document.querySelector('#searchInput').value=x.dataset.search;search(x.dataset.search)}));document.querySelector('#year').textContent=new Date().getFullYear();});
