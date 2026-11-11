/* ============ CONFIG (AL-Phone, Niamey) ============ */
const CFG={name:"AL-Phone",wa:"22790000000",fb:"https://facebook.com/",ig:"https://instagram.com/",tt:"https://tiktok.com/",
 pay:"Orange Money · Moov Money · Cash à la boutique",cur:"FCFA"};
const CATS=["Téléphones","Pochettes","Antichocs","Troc","Lampes","Numérique"];

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ls={g(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},s(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},r(k){try{localStorage.removeItem(k)}catch(e){}}};
let D={cfg:CFG,cats:CATS,products:[]},ME=null,q="",sort="pop",catSel="Tous",cart=[],wish=[];
const K=p=>"mbt_"+p+"_"+(ME?ME.id:"guest");
const money=n=>n?n.toLocaleString("fr-FR")+" "+CFG.cur:"Sur offre";
const toast=m=>{const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)};
const waLink=t=>"https://wa.me/"+CFG.wa.replace(/\D/g,"")+"?text="+encodeURIComponent(t);
const stars=r=>"★".repeat(r)+"☆".repeat(5-r);
const avg=p=>p.comments.length?p.comments.reduce((a,x)=>a+(x.r||5),0)/p.comments.length:0;
const promo=p=>p.old&&p.old>p.price?Math.round((1-p.price/p.old)*100):0;
const badge=p=>(promo(p)?`<span class="badge promo">-${promo(p)}%</span>`:"")+(p.sold>=20?'<span class="badge top">Top vente</span>':"")+(p.stock>0&&p.stock<5?'<span class="badge low">Stock faible</span>':"");
const img=p=>p.img&&/^https?:\/\//.test(p.img)?`<img src="${esc(p.img)}" alt="" loading="lazy">`:esc(p.emoji||"📦");
const phoneOK=v=>/^\+?[0-9 ]{8,16}$/.test(v),norm=v=>v.replace(/[^\d+]/g,"");
const pwOK=w=>w.length>=8&&/[A-Za-z]/.test(w)&&/\d/.test(w);
const busy=async(btn,fn)=>{btn.disabled=true;try{await fn()}catch(e){toast(e.message||"Erreur")}finally{btn.disabled=false}};

async function loadProducts(){D.products=await API.products()}
const saveCart=()=>{ls.s(K("cart"),cart);syncChrome()};
async function setSession(u){
 ME=u;
 if(u){const g=ls.g("mbt_cart_guest",[]),mine=ls.g(K("cart"),[]);g.forEach(x=>{const e=mine.find(c=>c.id===x.id);e?e.qty+=x.qty:mine.push(x)});ls.s(K("cart"),mine);ls.r("mbt_cart_guest")}
 cart=ls.g(K("cart"),[]);wish=ls.g(K("wish"),[]);syncChrome();
}
function syncChrome(){
 $("#cartN").textContent=cart.reduce((a,c)=>a+c.qty,0);
 $("#accName").textContent=ME?"👤 "+ME.name:"👤 Se connecter";
 $("#logo").textContent="🛍️ "+CFG.name;document.title=CFG.name;
 $("#catnav").innerHTML=["Tous",...CATS].map(c=>`<button data-c="${esc(c)}">${esc(c)}</button>`).join("");
 $$("#catnav button").forEach(b=>b.onclick=()=>{catSel=b.dataset.c;q="";$("#hq").value="";location.hash==="#boutique"?home():location.hash="boutique"});
 $("#footInfo").textContent=CFG.name;$("#footPay").textContent=CFG.pay;
}

/* ---------- Accueil ---------- */
const ICON={"Téléphones":"📱","Pochettes":"🧴","Antichocs":"🛡️","Troc":"🔄","Lampes":"💡","Numérique":"🎧","Tous":"🛍️"};
function cardHTML(p){const a=avg(p),can=p.price>0&&p.stock>0;return `<div class="card" data-p="${p.id}"><div class="ph">${badge(p)}${img(p)}</div><div class="i"><div class="nm">${esc(p.name)}</div>
<div class="stars">${a?stars(Math.round(a))+" <span class='mu'>("+p.comments.length+")</span>":"<span class='mu'>Pas encore d’avis</span>"}</div>
<div><span class="pr">${money(p.price)}</span>${p.old?`<span class="old">${money(p.old)}</span>`:""}</div>
<div class="mu">🛒 ${p.sold} vendu(s)${wish.includes(p.id)?" · ❤️":""}</div>${can?`<button class="qa" data-qa="${p.id}">+ Ajouter au panier</button>`:""}</div></div>`}
let slideI=0;
const SLIDES=[["s1","⚡ Offres flash du jour","Jusqu’à -20 % sur une sélection. Se termine à minuit.","Voir les offres","#flash",true],["s2","📱 Téléphones garantis 6 mois","Neufs, livrés en 24 à 72 h partout en Côte d’Ivoire.","Découvrir","#cat-Téléphones"],["s3","🔄 Troquez votre ancien téléphone","Envoyez une photo, recevez une offre d’échange.","Faire un troc","#cat-Troc"]];
function cdText(){const n=new Date(),e=new Date(n);e.setHours(24,0,0,0);const s=Math.max(0,Math.floor((e-n)/1000)),f=x=>String(x).padStart(2,"0");return [f(Math.floor(s/3600)),f(Math.floor(s%3600/60)),f(s%60)]}
function showSlide(i){slideI=(i+SLIDES.length)%SLIDES.length;$$(".slide").forEach((s,k)=>s.classList.toggle("on",k===slideI));$$(".sdots button").forEach((d,k)=>d.classList.toggle("on",k===slideI))}
function grid(l){return `<div class="grid">${l.map(cardHTML).join("")||'<p class="mu">Aucun article trouvé.</p>'}</div>`}
function home(){
 const filtered=!!q||catSel!=="Tous";
 let l=D.products.filter(p=>(catSel==="Tous"||p.cat===catSel)&&(p.name+" "+p.desc).toLowerCase().includes(q.toLowerCase()));
 const S={pop:(a,b)=>b.sold-a.sold,pa:(a,b)=>a.price-b.price,pd:(a,b)=>b.price-a.price,note:(a,b)=>avg(b)-avg(a),promo:(a,b)=>promo(b)-promo(a)};l=[...l].sort(S[sort]);
 const tiles=`<div class="tiles" id="cats">${["Tous",...CATS].map(c=>`<button class="tile ${c===catSel?"on":""}" data-ch="${esc(c)}"><i>${ICON[c]||"📦"}</i>${esc(c)}</button>`).join("")}</div>`;
 const sortSel=`<select id="so" style="width:auto;margin:0" aria-label="Trier">${[["pop","Meilleures ventes"],["pa","Prix croissant"],["pd","Prix décroissant"],["note","Mieux notés"],["promo","Promotions"]].map(o=>`<option value="${o[0]}" ${o[0]===sort?"selected":""}>${o[1]}</option>`).join("")}</select>`;
 let body;
 if(filtered){body=`<div class="sh"><h2>${q?"Résultats pour « "+esc(q)+" »":esc(catSel)} <span class="mu">${l.length} article(s)</span></h2>${sortSel}</div>${grid(l)}`}
 else{
  const fl=D.products.filter(p=>promo(p)>0&&p.stock>0),top=[...D.products].sort(S.pop).slice(0,4);
  const [h,m,s]=cdText();
  body=`<div class="trust"><div><span>🚚</span>Livraison 24–72 h</div><div><span>🔒</span>Paiement sécurisé</div><div><span>↩️</span>Retours sous 7 jours</div><div><span>🛡️</span>Garantie 6 mois</div></div>
  ${fl.length?`<div class="sh" id="flash"><h2>⚡ Offres flash</h2><span class="cd" aria-label="Temps restant"><b id="cdh">${h}</b><b id="cdm">${m}</b><b id="cds">${s}</b></span></div>${grid(fl)}`:""}
  <div class="sh"><h2>🔥 Meilleures ventes</h2></div>${grid(top)}
  <div class="sh"><h2>Tous nos produits <span class="mu">${l.length}</span></h2>${sortSel}</div>${grid(l)}`;
 }
 $("#app").innerHTML=(filtered?"":`<div class="slides" id="hero" aria-roledescription="carrousel">${SLIDES.map((s,k)=>`<div class="slide ${s[0]} ${k===slideI?"on":""}"><h1>${s[1]}</h1><p>${s[2]}</p><a class="btn" href="${s[4]}">${s[3]}</a></div>`).join("")}<div class="sdots">${SLIDES.map((s,k)=>`<button data-sd="${k}" aria-label="Diapositive ${k+1}" class="${k===slideI?"on":""}"></button>`).join("")}</div></div>`)+tiles+body;
 const so=$("#so");if(so)so.onchange=e=>{sort=e.target.value;home()};
 $$("[data-ch]").forEach(c=>c.onclick=()=>{catSel=c.dataset.ch;if(catSel==="Tous")q="";home()});
 $$("[data-sd]").forEach(b=>b.onclick=()=>showSlide(+b.dataset.sd));
 $$(".card").forEach(c=>c.onclick=()=>location.hash="p-"+c.dataset.p);
}
setInterval(()=>{const c=$("#cdh");if(c){const[h,m,s]=cdText();c.textContent=h;$("#cdm").textContent=m;$("#cds").textContent=s}},1000);
setInterval(()=>{if($("#hero")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)showSlide(slideI+1)},6000);
document.addEventListener("click",e=>{const b=e.target.closest("[data-qa]");if(!b)return;e.stopPropagation();e.preventDefault();
 const p=D.products.find(x=>x.id==b.dataset.qa);if(!p)return;const it=cart.find(c=>c.id===p.id),n=(it?it.qty:0)+1;
 if(n>p.stock)return toast("Stock insuffisant");it?it.qty=n:cart.push({id:p.id,qty:1});saveCart();toast("Ajouté au panier 🛒")},true);
const SKEL='<div class="sk" style="height:150px;margin-bottom:14px"></div><div class="grid">'+'<div class="sk c"></div>'.repeat(8)+'</div>';

/* ---------- Produit ---------- */
function prod(id){
 const p=D.products.find(x=>x.id==id);if(!p){location.hash="boutique";return}
 const a=avg(p),inW=wish.includes(p.id),rel=D.products.filter(x=>x.cat===p.cat&&x.id!==p.id).slice(0,4);
 const msg=(p.cat==="Troc"?"Bonjour, je veux faire un troc : ":"Bonjour, je veux commander : ")+p.name+" ("+money(p.price)+")";
 $("#app").innerHTML=`<button class="btn s sm" id="back">← Retour</button>
 <div class="pd" style="margin-top:12px"><div class="big">${badge(p)}${img(p)}</div><div>
 <span class="tag">${esc(p.cat)}</span><h2 style="margin:8px 0 4px">${esc(p.name)}</h2>
 <div class="stars">${a?stars(Math.round(a))+" "+a.toFixed(1)+" · "+p.comments.length+" avis":"Soyez le premier à noter"}</div>
 <div style="margin:10px 0"><span class="pr" style="font-size:26px">${money(p.price)}</span>${p.old?`<span class="old">${money(p.old)}</span> <span class="pill">-${(p.old-p.price).toLocaleString("fr-FR")} ${CFG.cur}</span>`:""}</div>
 <p>${esc(p.desc)}</p><p class="mu">${p.stock>0?"✅ En stock ("+p.stock+")":"❌ Rupture de stock"} · 🛒 ${p.sold} acheté(s)</p>
 <div class="row" style="margin:12px 0"><div class="qt"><button id="qm" aria-label="Moins">−</button><span id="qv">1</span><button id="qp" aria-label="Plus">+</button></div>
 <button class="btn" id="add" ${p.stock<=0||!p.price?"disabled":""}>🛒 Ajouter au panier</button><button class="btn s" id="wsh">${inW?"❤️ Wishlist":"🤍 Wishlist"}</button></div>
 <a class="btn block" style="background:#25d366;color:#08210f" target="_blank" rel="noopener" href="${waLink(msg)}">${p.cat==="Troc"?"🔄 Proposer un troc":"💬 Commander sur WhatsApp"}</a>
 <div class="secure">🔒 Paiement : ${esc(CFG.pay)}</div></div></div>
 <div class="box" style="margin-top:16px"><div class="tabs"><button class="on" data-t="D">Description</button><button data-t="A">Avis (${p.comments.length})</button><button data-t="L">Livraison</button></div>
 <div id="tD" style="padding-top:12px"><p>${esc(p.desc)}</p><p class="mu">Réf. MBT-${String(p.id).padStart(5,"0")}</p></div>
 <div id="tA" style="padding-top:12px;display:none">${p.comments.map(c=>`<div class="cm"><b>${esc(c.u)}</b> <span class="stars">${stars(c.r||5)}</span> <span class="mu">${esc(c.d)}</span><div>${esc(c.t)}</div></div>`).join("")||'<p class="mu">Aucun avis.</p>'}
 ${ME?`<label>Votre avis</label><textarea id="ct" rows="2" maxlength="300"></textarea><div class="row"><select id="cr" style="width:auto;margin:0"><option value="5">★★★★★</option><option value="4">★★★★☆</option><option value="3">★★★☆☆</option><option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option></select><button class="btn sm" id="cs">Publier</button></div>`:'<p class="mu"><a href="#auth/login">Connectez-vous</a> pour laisser un avis.</p>'}</div>
 <div id="tL" style="padding-top:12px;display:none"><p>🚚 24–72 h en Côte d’Ivoire.<br>↩️ Retour sous 7 jours si défectueux.<br>🛡️ Garantie 6 mois sur les téléphones.</p></div></div>
 ${rel.length?`<div class="sec-t">Produits similaires</div><div class="grid">${rel.map(cardHTML).join("")}</div>`:""}`;
 $("#back").onclick=()=>history.back();
 $$(".tabs button").forEach(t=>t.onclick=()=>{$$(".tabs button").forEach(x=>x.classList.remove("on"));t.classList.add("on");["D","A","L"].forEach(k=>$("#t"+k).style.display=k===t.dataset.t?"":"none")});
 let qty=1;$("#qm").onclick=()=>{qty=Math.max(1,qty-1);$("#qv").textContent=qty};$("#qp").onclick=()=>{qty=Math.min(Math.max(p.stock,1),qty+1);$("#qv").textContent=qty};
 $("#add").onclick=()=>{const it=cart.find(c=>c.id===p.id),n=(it?it.qty:0)+qty;if(n>p.stock)return toast("Stock insuffisant ("+p.stock+" max)");it?it.qty=n:cart.push({id:p.id,qty});saveCart();toast("Ajouté au panier 🛒");location.hash="cart"};
 $("#wsh").onclick=()=>{if(!ME)return location.hash="auth/login";wish=inW?wish.filter(x=>x!==p.id):[...wish,p.id];ls.s(K("wish"),wish);prod(id)};
 const cs=$("#cs");if(cs)cs.onclick=()=>busy(cs,async()=>{const t=$("#ct").value.trim();if(t.length<3)return toast("Écrivez votre avis");await API.addReview(p.id,ME.name,+$("#cr").value||5,t.slice(0,300));await loadProducts();toast("Merci !");prod(id)});
 $$(".card").forEach(c=>c.onclick=()=>location.hash="p-"+c.dataset.p);
}

/* ---------- Panier & commande ---------- */
const cartItems=()=>cart.map(c=>({...c,p:D.products.find(x=>x.id===c.id)})).filter(x=>x.p);
const fees=s=>s>=50000?0:1500;
function cartView(){
 const it=cartItems();
 if(!it.length){$("#app").innerHTML='<div class="box" style="text-align:center;padding:34px"><div style="font-size:56px">🛒</div><h3>Votre panier est vide</h3><button class="btn" id="go">Découvrir la boutique</button></div>';$("#go").onclick=()=>location.hash="boutique";return}
 const sub=it.reduce((a,c)=>a+c.p.price*c.qty,0),f=fees(sub),left=50000-sub;
 $("#app").innerHTML=`<h2>🛒 Mon panier</h2><div class="box"><table class="tbl">${it.map(c=>`<tr><td><div class="ic">${img(c.p)}</div></td><td style="width:100%"><b>${esc(c.p.name)}</b><div class="mu">${money(c.p.price)}</div></td>
 <td><div class="qt"><button data-q="-1" data-id="${c.id}">−</button><span>${c.qty}</span><button data-q="1" data-id="${c.id}">+</button></div></td>
 <td style="text-align:right"><b>${(c.p.price*c.qty).toLocaleString("fr-FR")}</b><br><button style="background:none;border:0;color:var(--rd);cursor:pointer;font-size:12px" data-x="${c.id}">Retirer</button></td></tr>`).join("")}</table></div>
 <div class="box">${left>0?`<div class="mu">Plus que ${left.toLocaleString("fr-FR")} ${CFG.cur} pour la livraison offerte</div><div class="bar"><i style="width:${Math.min(100,sub/500)}%"></i></div>`:'<span class="pill">Livraison offerte 🎉</span>'}
 <div class="sumrow"><span>Sous-total</span><span>${sub.toLocaleString("fr-FR")} ${CFG.cur}</span></div><div class="sumrow"><span>Livraison</span><span>${f?f.toLocaleString("fr-FR")+" "+CFG.cur:"Offerte"}</span></div>
 <div class="sumrow tot"><span>Total</span><span>${(sub+f).toLocaleString("fr-FR")} ${CFG.cur}</span></div><button class="btn block" id="co" style="margin-top:10px">Passer la commande →</button></div>`;
 $$("[data-q]").forEach(b=>b.onclick=()=>{const c=cart.find(x=>x.id==b.dataset.id),p=D.products.find(x=>x.id==c.id),n=c.qty+ +b.dataset.q;if(n>p.stock)return toast("Stock insuffisant");c.qty=Math.max(1,n);saveCart();cartView()});
 $$("[data-x]").forEach(b=>b.onclick=()=>{cart=cart.filter(c=>c.id!=b.dataset.x);saveCart();cartView()});
 $("#co").onclick=()=>{if(!ME){toast("Connectez-vous pour commander");location.hash="auth/login";return}checkout()};
}
function checkout(){
 const it=cartItems(),sub=it.reduce((a,c)=>a+c.p.price*c.qty,0),tot=sub+fees(sub);
 $("#app").innerHTML=`<h2>Finaliser la commande</h2><div class="box"><b>📍 Livraison</b>
 <label>Nom complet</label><input id="cn" maxlength="60" value="${esc(ME.name)}"><label>Téléphone</label><input id="cp" inputmode="tel" value="${esc(ME.phone||"")}">
 <label>Commune / Ville</label><input id="cc" maxlength="60" placeholder="Ex : Cocody, Abidjan"><label>Quartier / repère</label><input id="ca" maxlength="120"></div>
 <div class="box"><b>💳 Paiement</b><div class="paym" style="margin-top:8px">
 <label><input type="radio" name="pay" value="cinetpay" checked> 📱 Mobile Money / Carte (Orange, MTN, Wave, Visa)</label>
 <label><input type="radio" name="pay" value="cod"> 🚚 Paiement à la livraison</label></div></div>
 <div class="box"><div class="sumrow tot" style="border:0;margin:0;padding:0"><span>Total estimé</span><span>${tot.toLocaleString("fr-FR")} ${CFG.cur}</span></div>
 <button class="btn block" id="pay" style="margin-top:10px">🔒 Confirmer la commande</button><div class="secure">Le montant final est recalculé par le serveur. Le paiement se fait sur la page sécurisée CinetPay : le site ne voit jamais vos données de paiement.</div></div>`;
 $("#pay").onclick=()=>busy($("#pay"),async()=>{
  const addr={name:$("#cn").value.trim(),phone:$("#cp").value.trim(),city:$("#cc").value.trim(),area:$("#ca").value.trim()};
  if(!addr.name||!addr.city||!addr.area)return toast("Complétez tous les champs");if(!phoneOK(addr.phone))return toast("Numéro de téléphone invalide");
  const r=await API.checkout(cart.map(c=>({id:c.id,qty:c.qty})),addr,$$("input[name=pay]").find(x=>x.checked).value);
  cart=[];saveCart();await loadProducts();
  if(r.payment_url)return; // redirection vers CinetPay
  done(r,addr);
 });
}
const PAYST={PENDING:"⏳ Paiement en attente",PAID:"✅ Payé",COD:"💵 À la livraison",FAILED:"❌ Paiement échoué"};
const STATUS=["🕐 Commande reçue","✅ Confirmée","🚚 En livraison","📦 Livrée"];
function done(r,a){$("#app").innerHTML=`<div class="box" style="text-align:center;padding:30px"><div style="font-size:56px">🎉</div><h2>Merci ${esc(a.name)} !</h2><p>Commande <b>${esc(r.orderId)}</b> enregistrée — ${r.total.toLocaleString("fr-FR")} ${CFG.cur}</p>
 <p class="mu">Nous vous contacterons au ${esc(a.phone)} pour la livraison.</p>
 <a class="btn" style="background:#25d366;color:#08210f" target="_blank" rel="noopener" href="${waLink("Bonjour, ma commande "+r.orderId)}">💬 Prévenir sur WhatsApp</a> <button class="btn s" id="go">Suivre</button></div>`;$("#go").onclick=()=>location.hash="orders"}
async function ordersView(){
 if(!ME){location.hash="auth/login";return}
 $("#app").innerHTML='<p class="mu">Chargement…</p>';
 let m=[];try{m=(await API.myOrders()).filter(o=>o.user_id===ME.id)}catch(e){toast("Chargement impossible")}
 const ret=new URLSearchParams(location.search).get("paid");
 $("#app").innerHTML=`<h2>📦 Mes commandes</h2>${m.map(o=>`<div class="box"><div class="row" style="justify-content:space-between"><b>${esc(o.id)}</b><span class="tag">${STATUS[o.status]}</span></div>
 <div class="mu">${esc(o.created_at.slice(0,10))} · ${PAYST[o.payment_status]||""} · ${esc(o.address.city)}</div><div style="margin:8px 0">${o.items.map(i=>`<span class="tag">${esc(i.emoji)} ${esc(i.name)} ×${i.qty}</span> `).join("")}</div>
 <div class="sumrow tot"><span>Total</span><span>${o.total.toLocaleString("fr-FR")} ${CFG.cur}</span></div>
 <a class="btn s sm" target="_blank" rel="noopener" href="${waLink("Bonjour, au sujet de ma commande "+o.id)}">💬 Contacter le vendeur</a></div>`).join("")||'<div class="box"><p>Aucune commande.</p></div>'}`;
}
function wishlistView(){
 if(!ME){location.hash="auth/login";return}
 const l=D.products.filter(p=>wish.includes(p.id));
 $("#app").innerHTML=`<h2>❤️ Ma wishlist</h2>${l.length?'<div class="grid">'+l.map(cardHTML).join("")+"</div>":'<div class="box"><p>Wishlist vide.</p></div>'}`;
 $$(".card").forEach(c=>c.onclick=()=>location.hash="p-"+c.dataset.p);
}

/* ---------- Inscription / connexion (Supabase Auth) ---------- */
function authView(mode){
 const L=mode==="login";
 $("#app").innerHTML=`<div style="max-width:420px;margin:20px auto"><div class="box"><h2>${L?"🔐 Connexion":"📝 Créer mon compte"}</h2>
 ${L?"":'<label>Nom complet</label><input id="an" maxlength="60" autocomplete="name">'}<label>Téléphone</label><input id="ap" inputmode="tel" autocomplete="tel" placeholder="+225 07 00 00 00 00">
 <label>Mot de passe</label><input id="aw" type="password" autocomplete="${L?"current-password":"new-password"}" placeholder="8 caractères, lettres + chiffres">
 ${L?"":'<label>Confirmer le mot de passe</label><input id="aw2" type="password" autocomplete="new-password"><div id="pm" class="mu">Force : —</div>'}
 <button class="btn block" id="as">${L?"Se connecter":"Créer mon compte"}</button>
 <p class="mu" style="text-align:center">${L?'Nouveau ? <a href="#auth/register">Créer un compte</a>':'Déjà inscrit ? <a href="#auth/login">Se connecter</a>'}</p>
 <div class="secure">🔒 Votre compte est enregistré sur le serveur. Le mot de passe est haché, jamais stocké en clair.</div></div></div>`;
 const aw=$("#aw");if(!L)aw.oninput=()=>{const v=aw.value;let s=0;if(v.length>=8)s++;if(/[A-Z]/.test(v)&&/[a-z]/.test(v))s++;if(/\d/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;$("#pm").textContent="Force : "+["—","Faible 🟥","Moyen 🟧","Bon 🟨","Fort 🟩"][v?s:0]};
 $("#as").onclick=()=>busy($("#as"),async()=>{
  const p=norm($("#ap").value),w=aw.value;if(!phoneOK(p))return toast("Numéro invalide");
  if(L){await API.login(p,w)}
  else{const n=$("#an").value.trim();if(n.length<2)return toast("Nom requis");if(!pwOK(w))return toast("8 caractères min., lettres et chiffres");if(w!==$("#aw2").value)return toast("Les mots de passe diffèrent");await API.register(n,p,w);await API.login(p,w)}
  const me=await API.me();if(!me)throw new Error("Profil introuvable, réessayez");
  await setSession(me);toast("Bienvenue "+me.name+" !");location.hash="boutique";
 });
}
function accountView(){
 if(!ME){location.hash="auth/login";return}
 $("#app").innerHTML=`<h2>👤 Mon compte</h2><div class="box"><b>Informations</b><label>Nom</label><input id="mn" value="${esc(ME.name)}"><p class="mu">Téléphone : ${esc(ME.phone)}</p><button class="btn" id="ms">Enregistrer</button></div>
 <div class="box"><b>🔑 Nouveau mot de passe</b><input id="mw" type="password" autocomplete="new-password"><button class="btn" id="mc">Mettre à jour</button></div>
 <div class="box"><button class="btn s" id="lo">Se déconnecter</button>${ME.is_admin?' <a class="btn s" href="#admin">🛠️ Administration</a>':""}<p class="mu">Pour supprimer votre compte, contactez la boutique sur WhatsApp.</p></div>`;
 $("#ms").onclick=()=>busy($("#ms"),async()=>{const n=$("#mn").value.trim();if(n.length<2)return toast("Nom invalide");const{error}=await sb.from("profiles").update({name:n}).eq("id",ME.id);if(error)throw error;ME.name=n;syncChrome();toast("Profil mis à jour")});
 $("#mc").onclick=()=>busy($("#mc"),async()=>{const w=$("#mw").value;if(!pwOK(w))return toast("8 caractères min., lettres et chiffres");const{error}=await sb.auth.updateUser({password:w});if(error)throw error;toast("Mot de passe modifié")});
 $("#lo").onclick=async()=>{await API.logout();await setSession(null);location.hash="boutique"};
}
function pageView(slug){
 const P={about:["À propos",`<p>${esc(CFG.name)} : téléphones et accessoires tech en Côte d’Ivoire. Garantie 6 mois, livraison rapide, troc et paiement mobile.</p><div class="row"><a class="btn s sm" target="_blank" rel="noopener" href="${esc(CFG.fb)}">Facebook</a><a class="btn s sm" target="_blank" rel="noopener" href="${esc(CFG.ig)}">Instagram</a><a class="btn s sm" target="_blank" rel="noopener" href="${esc(CFG.tt)}">TikTok</a><a class="btn s sm" target="_blank" rel="noopener" href="${waLink("Bonjour !")}">💬 WhatsApp</a></div>`],
 delivery:["🚚 Livraison & retours","<p>Livraison 24–72 h partout en CI, offerte dès 50 000 FCFA (sinon 1 500 FCFA).</p><p>Retour sous 7 jours si produit défectueux : échange ou remboursement.</p>"],
 payment:["💳 Paiement",`<p>Moyens acceptés : <b>${esc(CFG.pay)}</b>. Le paiement en ligne passe par CinetPay ; aucun numéro de carte n’est saisi sur ce site.</p>`],
 faq:["❓ FAQ","<p><b>Commander ?</b> Panier → commande → paiement.</p><p><b>Suivi ?</b> Menu « Commandes ».</p><p><b>Troc ?</b> Envoyez la photo de votre téléphone sur WhatsApp.</p>"]};
 const p=P[slug]||P.about;$("#app").innerHTML=`<button class="btn s sm" id="back">← Retour</button><div class="box" style="margin-top:10px"><h2>${p[0]}</h2>${p[1]}</div>`;$("#back").onclick=()=>history.back();
}

/* ---------- Admin (réservé aux comptes is_admin, vérifié par le serveur) ---------- */
let editId=null;
async function adminView(){
 if(!ME||!ME.is_admin){$("#app").innerHTML='<div class="box"><b>🔐 Accès réservé</b><p class="mu">Connectez-vous avec un compte administrateur.</p><a class="btn" href="#auth/login">Connexion</a></div>';return}
 let os=[];try{os=await API.myOrders()}catch(e){toast("Commandes indisponibles")}
 const e=D.products.find(p=>p.id===editId)||{};
 $("#app").innerHTML=`<h2>🛠️ Tableau de bord</h2>
 <div class="kpis" style="margin-bottom:14px"><div class="kpi"><b>${D.products.length}</b>Produits</div><div class="kpi"><b>${os.length}</b>Commandes</div><div class="kpi"><b>${os.filter(o=>["PAID","COD"].includes(o.payment_status)).reduce((a,o)=>a+o.total,0).toLocaleString("fr-FR")}</b>CA ${CFG.cur}</div><div class="kpi"><b>${D.products.reduce((a,p)=>a+p.sold,0)}</b>Vendus</div></div>
 <div class="box"><b>📦 Commandes</b>${os.map(o=>`<div class="cm"><b>${esc(o.id)}</b> <span class="mu">${esc(o.created_at.slice(0,10))} · ${esc(o.address.name)} · ${esc(o.address.phone)} · ${esc(o.address.city)}, ${esc(o.address.area)}</span><div class="mu">${o.items.map(i=>esc(i.name)+" ×"+i.qty).join(", ")}</div><div class="row"><b style="color:var(--ac)">${o.total.toLocaleString("fr-FR")}</b><span class="tag">${PAYST[o.payment_status]||""}</span><select data-st="${esc(o.id)}" style="width:auto;margin:0">${STATUS.map((s,i)=>`<option value="${i}" ${i===o.status?"selected":""}>${s}</option>`).join("")}</select></div></div>`).join("")||'<p class="mu">Aucune commande.</p>'}</div>
 <div class="box"><b>${editId?"✏️ Modifier":"➕ Ajouter un article"}</b><label>Nom</label><input id="fn" value="${esc(e.name)}"><label>Catégorie</label><select id="fc">${CATS.map(c=>`<option ${e.cat===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
 <div class="row"><div style="flex:1"><label>Prix</label><input id="fp" type="number" min="0" value="${e.price??""}"></div><div style="flex:1"><label>Ancien prix</label><input id="fo" type="number" min="0" value="${e.old||""}"></div><div style="flex:1"><label>Stock</label><input id="fs" type="number" min="0" value="${e.stock??1}"></div><div style="flex:1"><label>Emoji</label><input id="fe" value="${esc(e.emoji||"📦")}"></div></div>
 <label>Photo</label><input id="fi" type="file" accept="image/*"><label>Description</label><textarea id="fd" rows="3">${esc(e.desc)}</textarea>
 <div class="row"><button class="btn" id="fsv">${editId?"Enregistrer":"Ajouter"}</button>${editId?'<button class="btn s" id="fx">Annuler</button>':""}</div></div>
 <div class="box"><b>📋 Articles</b>${D.products.map(p=>`<div class="cm row"><span style="flex:1">${esc(p.emoji)} ${esc(p.name)}<br><span class="mu">${money(p.price)} · stock ${p.stock} · vendus ${p.sold}</span></span><button class="btn s sm" data-e="${p.id}">Modifier</button><button class="btn d sm" data-d="${p.id}">Suppr.</button></div>`).join("")}</div>`;
 let im=e.img||"";
 $("#fi").onchange=ev=>{const f=ev.target.files[0];if(!f)return;if(f.size>3e6)return toast("Image trop lourde (3 Mo max)");busy($("#fsv"),async()=>{im=await API.uploadImage(f);toast("Photo envoyée ✓")})};
 $("#fsv").onclick=()=>busy($("#fsv"),async()=>{const n=$("#fn").value.trim();if(!n)return toast("Nom requis");
  await API.saveProduct({id:editId,name:n,cat:$("#fc").value,price:Math.max(0,+$("#fp").value||0),old:Math.max(0,+$("#fo").value||0),stock:Math.max(0,+$("#fs").value||0),emoji:$("#fe").value||"📦",img:im,desc:$("#fd").value.trim()});
  editId=null;await loadProducts();toast("Enregistré ✓");adminView()});
 if($("#fx"))$("#fx").onclick=()=>{editId=null;adminView()};
 $$("[data-e]").forEach(b=>b.onclick=()=>{editId=+b.dataset.e;adminView();scrollTo(0,0)});
 $$("[data-d]").forEach(b=>b.onclick=()=>{if(window.confirm("Supprimer cet article ?"))busy(b,async()=>{await API.deleteProduct(+b.dataset.d);await loadProducts();adminView()})});
 $$("[data-st]").forEach(s=>s.onchange=()=>busy(s,async()=>{await API.setOrderStatus(s.dataset.st,+s.value);toast("Statut mis à jour")}));
}

/* ---------- Routeur & démarrage ---------- */
function route(){
 const h=(location.hash||"#boutique").slice(1);
 if(h.startsWith("cat-")){catSel=decodeURIComponent(h.slice(4));home()}
 else if(h.startsWith("p-"))prod(h.slice(2));
 else if(h==="cart")cartView();else if(h==="orders")ordersView();else if(h==="wishlist")wishlistView();else if(h==="account")accountView();
 else if(h==="auth/login")authView("login");else if(h==="auth/register")authView("register");else if(h==="admin")adminView();
 else if(h.startsWith("page/"))pageView(h.slice(5));else if(h==="flash"){catSel="Tous";q="";home();setTimeout(()=>{const f=$("#flash");f&&f.scrollIntoView()},60)}else home();
 syncChrome();scrollTo(0,0);
}
$("#logo").onclick=()=>{catSel="Tous";q="";location.hash==="#boutique"?home():location.hash="boutique"};
$("#hbAcc").onclick=()=>location.hash=ME?"account":"auth/login";
$("#hbOrders").onclick=()=>location.hash="orders";$("#hbCart").onclick=()=>location.hash="cart";
$("#hqs").onclick=()=>{q=$("#hq").value.trim();catSel="Tous";location.hash==="#boutique"?home():location.hash="boutique"};
$("#hq").onkeydown=e=>{if(e.key==="Enter")$("#hqs").click()};
$$("footer [data-go]").forEach(b=>b.onclick=()=>location.hash=b.dataset.go);
addEventListener("hashchange",route);

(function(){
 const t=ls.g("mbt_theme",null);if(t)document.documentElement.dataset.theme=t;
 $("#hbTheme").onclick=()=>{const d=document.documentElement,dark=d.dataset.theme?d.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;d.dataset.theme=dark?"light":"dark";ls.s("mbt_theme",d.dataset.theme)};
 $$(".bnav button").forEach(b=>b.onclick=()=>{const n=b.dataset.n;if(n==="boutique"){catSel="Tous";q=""}if(n==="cat"){catSel="Tous";q="";if(location.hash!=="#boutique")location.hash="boutique";else home();setTimeout(()=>{const c=$("#cats");c&&c.scrollIntoView({block:"center"})},50)}else location.hash=n==="account"&&!ME?"auth/login":n});
 addEventListener("hashchange",()=>{const h=(location.hash||"#boutique").slice(1);$$(".bnav button").forEach(b=>b.classList.toggle("on",b.dataset.n===h||(b.dataset.n==="boutique"&&(h===""||h.startsWith("p-")||h.startsWith("cat-")))))});
})();
(async function start(){
 $("#app").innerHTML=SKEL;syncChrome();
 try{await setSession(await API.me());await loadProducts();route()}
 catch(e){$("#app").innerHTML='<div class="box"><b>Connexion au serveur impossible</b><p class="mu">Vérifiez votre connexion internet puis réessayez.</p><button class="btn" onclick="location.reload()">Réessayer</button></div>'}
})();
