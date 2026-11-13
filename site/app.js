/* ============================================================
   app.js  —  AL-Phone Niamey  |  Site vitrine catalogue
   Le visiteur parcourt le catalogue et contacte la boutique
   via WhatsApp ou les réseaux sociaux. Pas de panier/paiement.
   ============================================================ */

/* ── CONFIG (personnalisez ce bloc) ──────────────────────── */
const CFG = {
  name: "AL-Phone",
  wa:   "22790000000",           // numéro WhatsApp avec indicatif, sans +
  fb:   "https://facebook.com/",
  ig:   "https://instagram.com/",
  tt:   "https://tiktok.com/",
  pay:  "Orange Money · Moov Money · Cash à la boutique",
  cur:  "FCFA",
  addr: "Derrière l'école de la Gendarmerie, Niamey",
};
const CATS = ["Téléphones", "Pochettes", "Antichocs", "Lampes", "Numérique"];

/* ── Utilitaires ──────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  g(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  s(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  r(k)    { try { localStorage.removeItem(k); } catch {} },
};
const money  = n => n ? n.toLocaleString("fr-FR") + " " + CFG.cur : "Sur offre";
const toast  = m => { const t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
const waLink = t => "https://wa.me/" + CFG.wa.replace(/\D/g, "") + "?text=" + encodeURIComponent(t);
const stars  = r => "★".repeat(r) + "☆".repeat(5 - r);
const avg    = p => p.comments.length ? p.comments.reduce((a, x) => a + (x.r || 5), 0) / p.comments.length : 0;
const promo  = p => p.old && p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
const badge  = p =>
  (promo(p) ? `<span class="badge promo">-${promo(p)}%</span>` : "") +
  (p.sold >= 20 ? '<span class="badge top">Top vente</span>' : "") +
  (p.stock > 0 && p.stock < 5 ? '<span class="badge low">Stock faible</span>' : "");
const img    = p => p.img && /^https?:\/\//.test(p.img)
  ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : esc(p.emoji || "📦");
const busy   = async (btn, fn) => { btn.disabled = true; try { await fn(); } catch (e) { toast(e.message || "Erreur"); } finally { btn.disabled = false; } };
const pwOK   = w => w.length >= 8 && /[A-Za-z]/.test(w) && /\d/.test(w);
const phoneOK = v => /^\+?[0-9 ]{8,16}$/.test(v);
const norm   = v => v.replace(/[^\d+]/g, "");

let D    = { products: [] };
let ME   = null;   // admin connecté (ou null)
let q    = "";
let sort = "pop";
let catSel = "Tous";

async function loadProducts() {
  D.products = await API.products();
}

/* ── Chrome (header) ─────────────────────────────────────── */
function syncChrome() {
  $("#logo").textContent = "🛍️ " + CFG.name;
  document.title = CFG.name + " — Catalogue";
  $("#accName").textContent = ME ? "🛠️ Admin" : "Se connecter";
  $("#catnav").innerHTML = ["Tous", ...CATS].map(c =>
    `<button data-c="${esc(c)}">${esc(c)}</button>`).join("");
  $$("#catnav button").forEach(b => b.onclick = () => {
    catSel = b.dataset.c; q = ""; $("#hq").value = "";
    location.hash === "#boutique" ? home() : location.hash = "boutique";
  });
  $("#footInfo").textContent = CFG.name;
  $("#footPay").textContent = CFG.pay;
  // bouton admin visible seulement quand connecté
  const hbAdmin = $("#hbAdmin");
  if (hbAdmin) hbAdmin.style.display = ME ? "" : "none";
}

async function setSession(u) {
  ME = u;
  syncChrome();
}

/* ── Cartes produits ─────────────────────────────────────── */
const ICON = { "Téléphones": "📱", "Pochettes": "🧴", "Antichocs": "🛡️", "Lampes": "💡", "Numérique": "🎧", "Tous": "🛍️" };

function cardHTML(p) {
  const a = avg(p);
  const waMsg = `Bonjour AL-Phone, je suis intéressé(e) par : ${p.name} (${money(p.price)})`;
  return `<div class="card" data-p="${p.id}">
    <div class="ph">${badge(p)}${img(p)}</div>
    <div class="i">
      <div class="nm">${esc(p.name)}</div>
      <div class="stars">${a ? stars(Math.round(a)) + ` <span class='mu'>(${p.comments.length})</span>` : "<span class='mu'>Pas encore d'avis</span>"}</div>
      <div><span class="pr">${money(p.price)}</span>${p.old ? `<span class="old">${money(p.old)}</span>` : ""}</div>
      <div class="mu">🛒 ${p.sold} vendu(s)</div>
      <a class="qa" target="_blank" rel="noopener" href="${waLink(waMsg)}">💬 Contacter sur WhatsApp</a>
    </div>
  </div>`;
}

/* ── Accueil ─────────────────────────────────────────────── */
let slideI = 0;
const SLIDES = [
  ["s1", "⚡ Offres du moment", "Téléphones, accessoires et bien plus — au meilleur prix à Niamey.", "Voir le catalogue", "#boutique"],
  ["s2", "📱 Téléphones garantis 6 mois", "Neufs, débloqués, livrés rapidement.", "Découvrir", "#cat-Téléphones"],
  ["s3", "🔄 Troquez votre ancien téléphone", "Contactez-nous pour une offre d'échange.", "Nous contacter", "#page/about"],
];

function cdText() {
  const n = new Date(), e = new Date(n);
  e.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((e - n) / 1000));
  const f = x => String(x).padStart(2, "0");
  return [f(Math.floor(s / 3600)), f(Math.floor(s % 3600 / 60)), f(s % 60)];
}

function showSlide(i) {
  slideI = (i + SLIDES.length) % SLIDES.length;
  $$(".slide").forEach((s, k) => s.classList.toggle("on", k === slideI));
  $$(".sdots button").forEach((d, k) => d.classList.toggle("on", k === slideI));
}

function grid(l) {
  return `<div class="grid">${l.map(cardHTML).join("") || '<p class="mu">Aucun article trouvé.</p>'}</div>`;
}

function home() {
  const filtered = !!q || catSel !== "Tous";
  let l = D.products.filter(p =>
    (catSel === "Tous" || p.cat === catSel) &&
    (p.name + " " + p.desc).toLowerCase().includes(q.toLowerCase())
  );
  const S = {
    pop:   (a, b) => b.sold - a.sold,
    pa:    (a, b) => a.price - b.price,
    pd:    (a, b) => b.price - a.price,
    note:  (a, b) => avg(b) - avg(a),
    promo: (a, b) => promo(b) - promo(a),
  };
  l = [...l].sort(S[sort]);

  const tiles = `<div class="tiles" id="cats">${["Tous", ...CATS].map(c =>
    `<button class="tile ${c === catSel ? "on" : ""}" data-ch="${esc(c)}"><i>${ICON[c] || "📦"}</i>${esc(c)}</button>`
  ).join("")}</div>`;

  const sortSel = `<select id="so" style="width:auto;margin:0" aria-label="Trier">
    ${[["pop","Meilleures ventes"],["pa","Prix croissant"],["pd","Prix décroissant"],["note","Mieux notés"],["promo","Promotions"]]
      .map(o => `<option value="${o[0]}" ${o[0] === sort ? "selected" : ""}>${o[1]}</option>`).join("")}
  </select>`;

  let body;
  if (filtered) {
    body = `<div class="sh"><h2>${q ? "Résultats pour « " + esc(q) + " »" : esc(catSel)} <span class="mu">${l.length} article(s)</span></h2>${sortSel}</div>${grid(l)}`;
  } else {
    const fl  = D.products.filter(p => promo(p) > 0 && p.stock > 0);
    const top = [...D.products].sort(S.pop).slice(0, 4);
    const [h, m, s] = cdText();
    body = `<div class="trust">
      <div><span>🚚</span>Livraison disponible</div>
      <div><span>🔒</span>Paiement sécurisé</div>
      <div><span>↩️</span>Retours sous 7 jours</div>
      <div><span>🛡️</span>Garantie 6 mois</div>
    </div>
    ${fl.length ? `<div class="sh" id="flash"><h2>⚡ Offres flash</h2>
      <span class="cd" aria-label="Temps restant"><b id="cdh">${h}</b><b id="cdm">${m}</b><b id="cds">${s}</b></span>
    </div>${grid(fl)}` : ""}
    <div class="sh"><h2>🔥 Meilleures ventes</h2></div>${grid(top)}
    <div class="sh"><h2>Tous nos articles <span class="mu">${l.length}</span></h2>${sortSel}</div>${grid(l)}`;
  }

  const heroHTML = filtered ? "" : `<div class="slides" id="hero" aria-roledescription="carrousel">
    ${SLIDES.map((s, k) => `<div class="slide ${s[0]} ${k === slideI ? "on" : ""}">
      <h1>${s[1]}</h1><p>${s[2]}</p><a class="btn" href="${s[4]}">${s[3]}</a>
    </div>`).join("")}
    <div class="sdots">${SLIDES.map((s, k) =>
      `<button data-sd="${k}" aria-label="Diapositive ${k + 1}" class="${k === slideI ? "on" : ""}"></button>`
    ).join("")}</div>
  </div>`;

  $("#app").innerHTML = heroHTML + tiles + body;

  const so = $("#so"); if (so) so.onchange = e => { sort = e.target.value; home(); };
  $$("[data-ch]").forEach(c => c.onclick = () => { catSel = c.dataset.ch; if (catSel === "Tous") q = ""; home(); });
  $$("[data-sd]").forEach(b => b.onclick = () => showSlide(+b.dataset.sd));
  $$(".card").forEach(c => c.onclick = e => { if (!e.target.closest("a")) location.hash = "p-" + c.dataset.p; });
}

setInterval(() => { const c = $("#cdh"); if (c) { const [h, m, s] = cdText(); c.textContent = h; $("#cdm").textContent = m; $("#cds").textContent = s; } }, 1000);
setInterval(() => { if ($("#hero") && !matchMedia("(prefers-reduced-motion: reduce)").matches) showSlide(slideI + 1); }, 6000);

const SKEL = '<div class="sk" style="height:150px;margin-bottom:14px"></div><div class="grid">' + '<div class="sk c"></div>'.repeat(8) + '</div>';

/* ── Fiche produit ───────────────────────────────────────── */
function prod(id) {
  const p = D.products.find(x => x.id == id);
  if (!p) { location.hash = "boutique"; return; }
  const a   = avg(p);
  const rel = D.products.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  const waMsg = `Bonjour AL-Phone, je suis intéressé(e) par : ${p.name} (${money(p.price)})`;

  $("#app").innerHTML = `<button class="btn s sm" id="back">← Retour</button>
  <div class="pd" style="margin-top:12px">
    <div class="big">${badge(p)}${img(p)}</div>
    <div>
      <span class="tag">${esc(p.cat)}</span>
      <h2 style="margin:8px 0 4px">${esc(p.name)}</h2>
      <div class="stars">${a ? stars(Math.round(a)) + " " + a.toFixed(1) + " · " + p.comments.length + " avis" : "Soyez le premier à noter"}</div>
      <div style="margin:10px 0">
        <span class="pr" style="font-size:26px">${money(p.price)}</span>
        ${p.old ? `<span class="old">${money(p.old)}</span> <span class="pill">-${(p.old - p.price).toLocaleString("fr-FR")} ${CFG.cur}</span>` : ""}
      </div>
      <p>${esc(p.desc)}</p>
      <p class="mu">${p.stock > 0 ? "✅ En stock (" + p.stock + ")" : "❌ Rupture de stock"} · 🛒 ${p.sold} acheté(s)</p>
      <a class="btn block" style="background:#25d366;color:#08210f;margin:14px 0 6px" target="_blank" rel="noopener" href="${waLink(waMsg)}">
        💬 Contacter sur WhatsApp
      </a>
      <p class="mu secure">📍 ${esc(CFG.addr)}</p>
    </div>
  </div>
  <div class="box" style="margin-top:16px">
    <div class="tabs">
      <button class="on" data-t="D">Description</button>
      <button data-t="A">Avis (${p.comments.length})</button>
      <button data-t="L">Livraison</button>
    </div>
    <div id="tD" style="padding-top:12px"><p>${esc(p.desc)}</p><p class="mu">Réf. MBT-${String(p.id).padStart(5, "0")}</p></div>
    <div id="tA" style="padding-top:12px;display:none">
      ${p.comments.map(c => `<div class="cm"><b>${esc(c.u)}</b> <span class="stars">${stars(c.r || 5)}</span> <span class="mu">${esc(c.d)}</span><div>${esc(c.t)}</div></div>`).join("") || '<p class="mu">Aucun avis.</p>'}
      ${ME ? `<label>Votre avis</label><textarea id="ct" rows="2" maxlength="300"></textarea>
        <div class="row"><select id="cr" style="width:auto;margin:0">
          <option value="5">★★★★★</option><option value="4">★★★★☆</option>
          <option value="3">★★★☆☆</option><option value="2">★★☆☆☆</option><option value="1">★☆☆☆☆</option>
        </select><button class="btn sm" id="cs">Publier</button></div>` : ""}
    </div>
    <div id="tL" style="padding-top:12px;display:none">
      <p>🚚 Livraison disponible sur Niamey et environs.<br>↩️ Retour sous 7 jours si produit défectueux.<br>🛡️ Garantie 6 mois sur les téléphones.</p>
    </div>
  </div>
  ${rel.length ? `<div class="sec-t">Produits similaires</div><div class="grid">${rel.map(cardHTML).join("")}</div>` : ""}`;

  $("#back").onclick = () => history.back();
  $$(".tabs button").forEach(t => t.onclick = () => {
    $$(".tabs button").forEach(x => x.classList.remove("on")); t.classList.add("on");
    ["D", "A", "L"].forEach(k => $("#t" + k).style.display = k === t.dataset.t ? "" : "none");
  });
  $$(".card").forEach(c => c.onclick = e => { if (!e.target.closest("a")) location.hash = "p-" + c.dataset.p; });
  const cs = $("#cs");
  if (cs) cs.onclick = () => busy(cs, async () => {
    const t = $("#ct").value.trim();
    if (t.length < 3) return toast("Écrivez votre avis");
    await API.addReview(p.id, ME.name, +$("#cr").value || 5, t.slice(0, 300));
    await loadProducts(); toast("Merci !"); prod(id);
  });
}

/* ── Pages statiques ─────────────────────────────────────── */
function pageView(slug) {
  const P = {
    about: ["À propos", `<p><b>${esc(CFG.name)}</b> est votre boutique tech de confiance à Niamey. Téléphones neufs et reconditionnés, accessoires, reprises et échanges.</p>
      <p>📍 ${esc(CFG.addr)}</p>
      <div class="row" style="flex-wrap:wrap;gap:10px;margin-top:12px">
        <a class="btn" style="background:#25d366;color:#08210f" target="_blank" rel="noopener" href="${waLink("Bonjour AL-Phone !")}">💬 WhatsApp</a>
        <a class="btn s sm" target="_blank" rel="noopener" href="${esc(CFG.fb)}">Facebook</a>
        <a class="btn s sm" target="_blank" rel="noopener" href="${esc(CFG.ig)}">Instagram</a>
        <a class="btn s sm" target="_blank" rel="noopener" href="${esc(CFG.tt)}">TikTok</a>
      </div>`],
    delivery: ["🚚 Livraison & retours", "<p>Livraison disponible sur Niamey et environs. Retour sous 7 jours si produit défectueux : échange ou remboursement.</p>"],
    payment:  ["💳 Paiement", `<p>Paiements acceptés : <b>${esc(CFG.pay)}</b>. Contactez-nous par WhatsApp pour confirmer votre commande.</p>`],
    faq:      ["❓ FAQ", `<p><b>Comment acheter ?</b> Choisissez un article et cliquez sur « Contacter sur WhatsApp ».</p>
      <p><b>Livraison ?</b> Oui, sur Niamey et environs. Contactez-nous pour les détails.</p>
      <p><b>Troc ?</b> Envoyez la photo de votre téléphone sur WhatsApp, nous vous ferons une offre.</p>`],
  };
  const page = P[slug] || P.about;
  $("#app").innerHTML = `<button class="btn s sm" id="back">← Retour</button>
    <div class="box" style="margin-top:10px"><h2>${page[0]}</h2>${page[1]}</div>`;
  $("#back").onclick = () => history.back();
}

/* ── Connexion admin ─────────────────────────────────────── */
function authView(mode) {
  const L = mode === "login";
  $("#app").innerHTML = `<div style="max-width:420px;margin:20px auto"><div class="box">
    <h2>${L ? "🔐 Accès Admin" : "📝 Créer un accès"}</h2>
    ${L ? "" : '<label>Nom complet</label><input id="an" maxlength="60" autocomplete="name">'}
    <label>Téléphone</label><input id="ap" inputmode="tel" autocomplete="tel" placeholder="+227 XX XX XX XX">
    <label>Mot de passe</label><input id="aw" type="password" autocomplete="${L ? "current-password" : "new-password"}">
    ${L ? "" : '<label>Confirmer</label><input id="aw2" type="password" autocomplete="new-password">'}
    <button class="btn block" id="as">${L ? "Se connecter" : "Créer"}</button>
    <p class="mu" style="text-align:center;margin-top:10px">${L ? '' : '<a href="#auth/login">Se connecter</a>'}</p>
  </div></div>`;

  $("#as").onclick = () => busy($("#as"), async () => {
    const p = norm($("#ap").value), w = $("#aw").value;
    if (!phoneOK(p)) return toast("Numéro invalide");
    if (L) {
      await API.login(p, w);
    } else {
      const n = $("#an").value.trim();
      if (n.length < 2) return toast("Nom requis");
      if (!pwOK(w)) return toast("8 caractères min., lettres et chiffres");
      if (w !== $("#aw2").value) return toast("Les mots de passe diffèrent");
      await API.register(n, p, w);
      await API.login(p, w);
    }
    const me = await API.me();
    if (!me) throw new Error("Profil introuvable");
    if (!me.is_admin) { await API.logout(); throw new Error("Accès réservé aux administrateurs"); }
    await setSession(me); toast("Bienvenue " + me.name + " !"); location.hash = "admin";
  });
}

/* ── Tableau de bord Admin ───────────────────────────────── */
let editId = null, adminTab = "products";

async function adminView() {
  if (!ME || !ME.is_admin) {
    $("#app").innerHTML = `<div class="box"><b>🔐 Accès réservé</b><p class="mu">Connectez-vous avec un compte administrateur.</p><a class="btn" href="#auth/login">Connexion</a></div>`;
    return;
  }
  let users = []; try { users = await API.users(); } catch {}
  const e = D.products.find(p => p.id === editId) || {};

  const trocRow = t => {
    const badgeBg = t.status === "ACCEPTED" ? "var(--ok)" : (t.status === "REJECTED" ? "var(--rd)" : "var(--mu)");
    const imgHtml = t.img_url ? `<a href="${esc(t.img_url)}" target="_blank"><img src="${esc(t.img_url)}" style="max-width:70px;border-radius:6px"></a>` : "—";
    return `<tr>
      <td><b>${esc(t.client_name)}</b><div class="mu">${esc(t.phone)}</div></td>
      <td>${esc(t.phone_model)}</td><td>${esc(t.condition || "")}</td>
      <td>${imgHtml}</td>
      <td><span class="tag" style="background:${badgeBg};color:#fff">${esc(t.status || "PENDING")}</span></td>
      <td>${esc(t.descr || "")}</td>
    </tr>`;
  };

  $("#app").innerHTML = `<h2>🛠️ Administration AL-Phone</h2>
  <div class="kpis" style="margin-bottom:14px">
    <div class="kpi"><b>${D.products.length}</b>Articles</div>
    <div class="kpi"><b>${D.products.filter(p => p.stock === 0).length}</b>Ruptures</div>
    <div class="kpi"><b>${D.products.reduce((a, p) => a + p.sold, 0)}</b>Vendus (total)</div>
    <div class="kpi"><b>${users.length}</b>Utilisateurs</div>
  </div>
  <div class="tabs" style="margin-bottom:14px">
    <button class="${adminTab === "products" ? "on" : ""}" data-at="products">🛍️ Catalogue</button>
    <button class="${adminTab === "users" ? "on" : ""}" data-at="users">👥 Utilisateurs</button>
  </div>

  <!-- CATALOGUE -->
  <div id="at-products" style="display:${adminTab === "products" ? "block" : "none"}">
    <div class="box">
      <b>${editId ? "✏️ Modifier l'article #" + editId : "➕ Ajouter un article"}</b>
      <label>Nom du produit</label><input id="fn" value="${esc(e.name || "")}" maxlength="120">
      <label>Catégorie</label><select id="fc">${CATS.map(c => `<option ${e.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <div class="row">
        <div style="flex:1"><label>Prix (FCFA)</label><input id="fp" type="number" min="0" value="${e.price ?? ""}"></div>
        <div style="flex:1"><label>Ancien prix (barré)</label><input id="fo" type="number" min="0" value="${e.old || ""}"></div>
        <div style="flex:1"><label>Stock</label><input id="fs" type="number" min="0" value="${e.stock ?? 0}"></div>
        <div style="flex:1"><label>Emoji</label><input id="fe" value="${esc(e.emoji || "📦")}"></div>
      </div>
      <div class="row">
        <div style="flex:1"><label>Ordre (0 = premier)</label><input id="ford" type="number" value="${e.order || 0}"></div>
        <div style="flex:1"><label>Statut</label><select id="factive">
          <option value="true" ${e.active !== false ? "selected" : ""}>🟢 Visible</option>
          <option value="false" ${e.active === false ? "selected" : ""}>🔴 Masqué</option>
        </select></div>
      </div>
      <label>Photo</label><input id="fi" type="file" accept="image/*">
      ${e.img ? `<div class="mu">Photo actuelle : <a href="${esc(e.img)}" target="_blank">Voir</a></div>` : ""}
      <label>Description</label><textarea id="fd" rows="3">${esc(e.desc || "")}</textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn" id="fsv">${editId ? "Enregistrer" : "Ajouter"}</button>
        ${editId ? '<button class="btn s" id="fx">Annuler</button>' : ""}
      </div>
    </div>
    <div class="box"><b>📋 Articles</b>
      ${D.products.map(p => `<div class="cm row" style="align-items:center">
        <span style="font-size:22px">${esc(p.emoji)}</span>
        <div style="flex:1"><b>${esc(p.name)}</b> <span class="tag">${esc(p.cat)}</span>
          ${p.active === false ? '<span class="badge" style="background:#dc2626;position:static">Masqué</span>' : ""}
          <div class="mu">${money(p.price)} · Stock : ${p.stock} · Vendus : ${p.sold}</div>
        </div>
        <div class="row">
          <button class="btn s sm" data-up="${p.id}">↑</button>
          <button class="btn s sm" data-down="${p.id}">↓</button>
          <button class="btn s sm" data-tog="${p.id}">${p.active === false ? "Publier" : "Masquer"}</button>
          <button class="btn s sm" data-e="${p.id}">Modifier</button>
          <button class="btn d sm" data-d="${p.id}">Suppr.</button>
        </div>
      </div>`).join("")}
    </div>
  </div>

  <!-- UTILISATEURS -->
  <div id="at-users" style="display:${adminTab === "users" ? "block" : "none"}">
    <div class="box"><b>👥 Utilisateurs</b>
      <table class="tbl">
        <tr><th>Nom</th><th>Téléphone</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr>
        ${users.map(u => `<tr>
          <td><b>${esc(u.name)}</b><div class="mu">${u.created_at?.slice(0, 10)}</div></td>
          <td>${esc(u.phone)}</td>
          <td>${u.is_admin ? '<span class="pill">Admin</span>' : "Visiteur"}</td>
          <td>${u.blocked ? '<span class="tag" style="background:var(--rd);color:#fff">Bloqué</span>' : '<span class="tag" style="background:var(--ok);color:#fff">Actif</span>'}</td>
          <td>
            <button class="btn s sm" data-toggle-admin="${u.id}" data-val="${u.is_admin ? 0 : 1}">${u.is_admin ? "Retirer Admin" : "Mettre Admin"}</button>
            <button class="btn ${u.blocked ? "s" : "d"} sm" data-toggle-block="${u.id}" data-val="${u.blocked ? 0 : 1}">${u.blocked ? "Débloquer" : "Bloquer"}</button>
          </td>
        </tr>`).join("")}
      </table>
    </div>
  </div>`;

  // Onglets
  $$(".tabs button[data-at]").forEach(b => b.onclick = () => { adminTab = b.dataset.at; adminView(); });

  // Photo upload
  let im = e.img || "";
  const fi = $("#fi");
  if (fi) fi.onchange = ev => {
    const f = ev.target.files[0]; if (!f) return;
    if (f.size > 3e6) return toast("Image trop lourde (3 Mo max)");
    busy($("#fsv"), async () => { im = await API.uploadImage(f); toast("Photo envoyée ✓"); });
  };

  // Sauvegarder produit
  const fsv = $("#fsv");
  if (fsv) fsv.onclick = () => busy(fsv, async () => {
    const n = $("#fn").value.trim(); if (!n) return toast("Nom requis");
    await API.saveProduct({
      id: editId, name: n, cat: $("#fc").value,
      price: Math.max(0, +$("#fp").value || 0), old: Math.max(0, +$("#fo").value || 0),
      stock: Math.max(0, +$("#fs").value || 0), emoji: $("#fe").value || "📦",
      img: im, desc: $("#fd").value.trim(), order: +($("#ford").value || 0),
      active: $("#factive").value === "true",
    });
    editId = null; await loadProducts(); toast("Enregistré ✓"); adminView();
  });

  if ($("#fx")) $("#fx").onclick = () => { editId = null; adminView(); };
  $$("[data-e]").forEach(b => b.onclick = () => { editId = +b.dataset.e; adminView(); scrollTo(0, 0); });
  $$("[data-d]").forEach(b => b.onclick = () => {
    if (window.confirm("Supprimer cet article ?")) busy(b, async () => { await API.deleteProduct(+b.dataset.d); await loadProducts(); adminView(); });
  });
  $$("[data-up]").forEach(b => b.onclick = async () => {
    const id = +b.dataset.up, p = D.products.find(x => x.id === id);
    if (p) { await API.saveProduct({ ...p, order: (p.order || 0) - 1 }); await loadProducts(); adminView(); }
  });
  $$("[data-down]").forEach(b => b.onclick = async () => {
    const id = +b.dataset.down, p = D.products.find(x => x.id === id);
    if (p) { await API.saveProduct({ ...p, order: (p.order || 0) + 1 }); await loadProducts(); adminView(); }
  });
  $$("[data-tog]").forEach(b => b.onclick = async () => {
    const id = +b.dataset.tog, p = D.products.find(x => x.id === id);
    if (p) { await API.toggleActive(id, !p.active); await loadProducts(); adminView(); }
  });
  $$("[data-toggle-admin]").forEach(b => b.onclick = async () => {
    const id = b.dataset.toggleAdmin, val = +b.dataset.val;
    if (window.confirm(val ? "Promouvoir en admin ?" : "Retirer les droits admin ?")) {
      await API.setUser(id, { is_admin: !!val }); toast("Droits mis à jour"); adminView();
    }
  });
  $$("[data-toggle-block]").forEach(b => b.onclick = async () => {
    const id = b.dataset.toggleBlock, val = +b.dataset.val;
    if (window.confirm(val ? "Bloquer cet utilisateur ?" : "Débloquer ?")) {
      await API.setUser(id, { blocked: !!val }); toast("Statut mis à jour"); adminView();
    }
  });
}

/* ── Routeur ─────────────────────────────────────────────── */
function route() {
  const h = (location.hash || "#boutique").slice(1);
  if      (h.startsWith("cat-"))       { catSel = decodeURIComponent(h.slice(4)); home(); }
  else if (h.startsWith("p-"))         prod(h.slice(2));
  else if (h.startsWith("page/"))      pageView(h.slice(5));
  else if (h === "admin")              adminView();
  else if (h === "auth/login")         authView("login");
  else if (h === "auth/register")      authView("register");
  else if (h === "flash")              { catSel = "Tous"; q = ""; home(); setTimeout(() => { const f = $("#flash"); f && f.scrollIntoView(); }, 60); }
  else                                 home();
  syncChrome();
  scrollTo(0, 0);
}

/* ── Initialisation ──────────────────────────────────────── */
$("#logo").onclick  = () => { catSel = "Tous"; q = ""; location.hash === "#boutique" ? home() : location.hash = "boutique"; };
$("#hbAcc").onclick = () => location.hash = ME ? "admin" : "auth/login";
$("#hqs").onclick   = () => { q = $("#hq").value.trim(); catSel = "Tous"; location.hash === "#boutique" ? home() : location.hash = "boutique"; };
$("#hq").onkeydown  = e => { if (e.key === "Enter") $("#hqs").click(); };
$$("footer [data-go]").forEach(b => b.onclick = () => location.hash = b.dataset.go);
addEventListener("hashchange", route);

// Thème sombre/clair
(function () {
  const t = ls.g("mbt_theme", null); if (t) document.documentElement.dataset.theme = t;
  $("#hbTheme").onclick = () => {
    const d = document.documentElement;
    const dark = d.dataset.theme ? d.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    d.dataset.theme = dark ? "light" : "dark";
    ls.s("mbt_theme", d.dataset.theme);
  };
  // Nav mobile
  $$(".bnav button").forEach(b => b.onclick = () => {
    const n = b.dataset.n;
    if (n === "boutique") { catSel = "Tous"; q = ""; }
    if (n === "cat") {
      catSel = "Tous"; q = "";
      if (location.hash !== "#boutique") location.hash = "boutique";
      else home();
      setTimeout(() => { const c = $("#cats"); c && c.scrollIntoView({ block: "center" }); }, 50);
      return;
    }
    location.hash = n === "admin" && !ME ? "auth/login" : n;
  });
  addEventListener("hashchange", () => {
    const h = (location.hash || "#boutique").slice(1);
    $$(".bnav button").forEach(b => b.classList.toggle("on",
      b.dataset.n === h || (b.dataset.n === "boutique" && (h === "" || h.startsWith("p-") || h.startsWith("cat-")))
    ));
  });
})();

(async function start() {
  $("#app").innerHTML = SKEL; syncChrome();
  try {
    const me = await API.me();
    if (me && me.is_admin) await setSession(me);
    await loadProducts();
    route();
  } catch (e) {
    $("#app").innerHTML = `<div class="box"><b>Connexion au serveur impossible</b>
      <p class="mu">Vérifiez votre connexion internet.</p>
      <button class="btn" onclick="location.reload()">Réessayer</button></div>`;
  }
})();
