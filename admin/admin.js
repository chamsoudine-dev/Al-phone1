/* admin.js — Logique du tableau de bord d'administration AL-Phone */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const toast = msg => {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
};

let CURRENT_ADMIN = null;
let ALL_PRODUCTS = [];
let ALL_USERS = [];

/* ── Initialisation ─────────────────────────────────── */
async function init() {
  try {
    const me = await API.me();
    if (!me || !me.is_admin) {
      showLogin(true);
      return;
    }
    CURRENT_ADMIN = me;
    showLogin(false);
    $("#admin-name").textContent = me.name || "Admin";
    await refreshData();
  } catch (e) {
    showLogin(true);
  }
}

function showLogin(show) {
  const el = $("#login-screen");
  if (el) el.style.display = show ? "flex" : "none";
}

/* ── Rafraîchissement des données ───────────────────── */
async function refreshData() {
  try {
    ALL_PRODUCTS = await API.allProducts();
    updateKPIs();
    renderProducts();
    ALL_USERS = await API.users();
    renderUsers();
  } catch (err) {
    toast("Erreur de chargement des données : " + err.message);
  }
}

function updateKPIs() {
  const total = ALL_PRODUCTS.length;
  const online = ALL_PRODUCTS.filter(p => p.active).length;
  const out = ALL_PRODUCTS.filter(p => p.stock <= 0).length;
  const sold = ALL_PRODUCTS.reduce((acc, p) => acc + (p.sold || 0), 0);

  $("#kpi-total").textContent = total;
  $("#kpi-online").textContent = online;
  $("#kpi-out").textContent = out;
  $("#kpi-sold").textContent = sold;
}

/* ── Rendu de la table produits ─────────────────────── */
function renderProducts() {
  const search = ($("#search-prod").value || "").toLowerCase().trim();
  const cat = $("#filter-cat").value;

  const filtered = ALL_PRODUCTS.filter(p => {
    const matchCat = cat === "Tous" || p.cat === cat;
    const matchSearch = !search || (p.name + " " + p.descr).toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  const tbody = $("#table-products");
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">Aucun article trouvé.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const imgHtml = p.img_url
      ? `<img src="${esc(p.img_url)}" alt="">`
      : (p.emoji || "📦");

    const statusBadge = p.active
      ? '<span class="badge badge-active">🟢 En ligne</span>'
      : '<span class="badge badge-hidden">🔴 Masqué</span>';

    const stockBadge = p.stock <= 0
      ? '<span class="badge badge-hidden">Rupture (0)</span>'
      : (p.stock < 5 ? `<span class="badge badge-low">Faible (${p.stock})</span>` : p.stock);

    const priceText = p.old_price && p.old_price > p.price
      ? `<b>${p.price.toLocaleString("fr-FR")} FCFA</b> <span style="text-decoration:line-through;color:var(--text-muted);font-size:12px">${p.old_price.toLocaleString("fr-FR")}</span>`
      : `<b>${p.price.toLocaleString("fr-FR")} FCFA</b>`;

    return `<tr>
      <td>
        <div class="product-cell">
          <div class="product-img">${imgHtml}</div>
          <div>
            <b>${esc(p.name)}</b>
            <div style="font-size:12px;color:var(--text-muted)">Position : ${p.display_order || 0}</div>
          </div>
        </div>
      </td>
      <td><span class="badge" style="background:#334155;color:#f8fafc">${esc(p.cat)}</span></td>
      <td>${priceText}</td>
      <td>${stockBadge}</td>
      <td>${p.sold || 0}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn-action" data-edit="${p.id}">✏️ Modifier</button>
        <button class="btn-action" data-toggle="${p.id}" data-active="${p.active}">${p.active ? "Masquer" : "Publier"}</button>
        <button class="btn-action danger" data-delete="${p.id}">🗑️</button>
      </td>
    </tr>`;
  }).join("");

  // Événements d'action
  $$("[data-edit]").forEach(b => b.onclick = () => openEditModal(+b.dataset.edit));
  $$("[data-toggle]").forEach(b => b.onclick = async () => {
    const id = +b.dataset.toggle;
    const currentActive = b.dataset.active === "true";
    try {
      await API.toggleActive(id, !currentActive);
      toast(currentActive ? "Article masqué de la boutique" : "Article publié en ligne ✓");
      await refreshData();
    } catch (e) {
      toast("Erreur : " + e.message);
    }
  });
  $$("[data-delete]").forEach(b => b.onclick = async () => {
    const id = +b.dataset.delete;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet article ?")) {
      try {
        await API.deleteProduct(id);
        toast("Article supprimé ✓");
        await refreshData();
      } catch (e) {
        toast("Erreur : " + e.message);
      }
    }
  });
}

/* ── Rendu de la table utilisateurs ─────────────────── */
function renderUsers() {
  const tbody = $("#table-users");
  if (!ALL_USERS.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Aucun utilisateur.</td></tr>';
    return;
  }

  tbody.innerHTML = ALL_USERS.map(u => `<tr>
    <td><b>${esc(u.name)}</b><div style="font-size:12px;color:var(--text-muted)">Inscrit le ${u.created_at?.slice(0, 10)}</div></td>
    <td>${esc(u.phone)}</td>
    <td>${u.is_admin ? '<span class="badge badge-active">Administrateur</span>' : 'Client'}</td>
    <td>${u.blocked ? '<span class="badge badge-hidden">Bloqué</span>' : '<span class="badge badge-active">Actif</span>'}</td>
    <td>
      <button class="btn-action" data-toggle-admin="${u.id}" data-val="${u.is_admin ? 0 : 1}">
        ${u.is_admin ? "Retirer admin" : "Promouvoir admin"}
      </button>
      <button class="btn-action ${u.blocked ? "" : "danger"}" data-toggle-block="${u.id}" data-val="${u.blocked ? 0 : 1}">
        ${u.blocked ? "Débloquer" : "Bloquer"}
      </button>
    </td>
  </tr>`).join("");

  $$("[data-toggle-admin]").forEach(b => b.onclick = async () => {
    const id = b.dataset.toggleAdmin, val = +b.dataset.val;
    if (window.confirm(val ? "Nommer cet utilisateur administrateur ?" : "Retirer les privilèges d'administrateur ?")) {
      await API.setUser(id, { is_admin: !!val });
      toast("Privilèges mis à jour ✓");
      await refreshData();
    }
  });
  $$("[data-toggle-block]").forEach(b => b.onclick = async () => {
    const id = b.dataset.toggleBlock, val = +b.dataset.val;
    if (window.confirm(val ? "Bloquer cet utilisateur ?" : "Débloquer cet utilisateur ?")) {
      await API.setUser(id, { blocked: !!val });
      toast("Statut mis à jour ✓");
      await refreshData();
    }
  });
}

/* ── Modal Produit (Ajout / Modification) ───────────── */
function openAddModal() {
  $("#modal-title").textContent = "➕ Ajouter un article";
  $("#p_id").value = "";
  $("#p_name").value = "";
  $("#p_cat").value = "Téléphones";
  $("#p_emoji").value = "📱";
  $("#p_price").value = "";
  $("#p_old").value = "";
  $("#p_stock").value = "10";
  $("#p_order").value = "0";
  $("#p_active").value = "true";
  $("#p_desc").value = "";
  $("#p_img_url").value = "";
  $("#p_file").value = "";
  $("#img-preview").innerHTML = "";
  $("#modal-product").style.display = "flex";
}

function openEditModal(id) {
  const p = ALL_PRODUCTS.find(x => x.id === id);
  if (!p) return;
  $("#modal-title").textContent = `✏️ Modifier l'article #${p.id}`;
  $("#p_id").value = p.id;
  $("#p_name").value = p.name || "";
  $("#p_cat").value = p.cat || "Téléphones";
  $("#p_emoji").value = p.emoji || "📦";
  $("#p_price").value = p.price ?? "";
  $("#p_old").value = p.old_price || "";
  $("#p_stock").value = p.stock ?? 0;
  $("#p_order").value = p.display_order || 0;
  $("#p_active").value = p.active ? "true" : "false";
  $("#p_desc").value = p.descr || "";
  $("#p_img_url").value = p.img_url || "";
  $("#p_file").value = "";
  $("#img-preview").innerHTML = p.img_url
    ? `<img src="${esc(p.img_url)}" style="max-height:80px;border-radius:6px;border:1px solid var(--border)">`
    : "";
  $("#modal-product").style.display = "flex";
}

function closeModal() {
  $("#modal-product").style.display = "none";
}

function normalizePhone(p) {
  let clean = String(p || "").replace(/\D/g, "");
  if (!clean) return "";
  if (clean.length === 8) return "+227" + clean;
  if (clean.startsWith("227") && clean.length === 11) return "+" + clean;
  return p.trim().startsWith("+") ? ("+" + clean) : ("+" + clean);
}

/* ── Événements ─────────────────────────────────────── */
// Gestion des onglets de l'écran d'accueil
$("#tab-login").onclick = () => {
  $("#form-login-box").style.display = "block";
  $("#form-register-box").style.display = "none";
  $("#form-forgot-box").style.display = "none";
  $("#tab-login").style.background = "var(--primary)";
  $("#tab-login").style.color = "#fff";
  $("#tab-register").style.background = "transparent";
  $("#tab-register").style.color = "var(--text)";
  $("#tab-forgot").style.background = "transparent";
  $("#tab-forgot").style.color = "var(--text)";
};

$("#tab-register").onclick = () => {
  $("#form-login-box").style.display = "none";
  $("#form-register-box").style.display = "block";
  $("#form-forgot-box").style.display = "none";
  $("#tab-register").style.background = "var(--primary)";
  $("#tab-register").style.color = "#fff";
  $("#tab-login").style.background = "transparent";
  $("#tab-login").style.color = "var(--text)";
  $("#tab-forgot").style.background = "transparent";
  $("#tab-forgot").style.color = "var(--text)";
};

$("#tab-forgot").onclick = () => {
  $("#form-login-box").style.display = "none";
  $("#form-register-box").style.display = "none";
  $("#form-forgot-box").style.display = "block";
  $("#tab-forgot").style.background = "var(--primary)";
  $("#tab-forgot").style.color = "#fff";
  $("#tab-login").style.background = "transparent";
  $("#tab-login").style.color = "var(--text)";
  $("#tab-register").style.background = "transparent";
  $("#tab-register").style.color = "var(--text)";
};

$("#btn-login").onclick = async () => {
  const phone = normalizePhone($("#l_phone").value);
  const pass = $("#l_pass").value;
  if (!phone || !pass) return toast("Remplissez le téléphone et mot de passe");
  
  const btn = $("#btn-login");
  btn.disabled = true;
  btn.textContent = "Connexion...";
  try {
    await API.login(phone, pass);
    const me = await API.me();
    if (!me || !me.is_admin) {
      await API.logout();
      throw new Error("Ce compte n'a pas encore les droits administrateur.");
    }
    CURRENT_ADMIN = me;
    showLogin(false);
    $("#admin-name").textContent = me.name || "Admin";
    toast("Bienvenue " + me.name + " !");
    await refreshData();
  } catch (err) {
    toast(err.message || "Échec de connexion");
  } finally {
    btn.disabled = false;
    btn.textContent = "Connexion sécurisée →";
  }
};

$("#btn-register").onclick = async () => {
  const name = $("#r_name").value.trim();
  const phone = normalizePhone($("#r_phone").value);
  const pass = $("#r_pass").value;
  if (!name || name.length < 2) return toast("Veuillez renseigner votre nom");
  if (!phone) return toast("Numéro de téléphone invalide");
  if (!pass || pass.length < 6) return toast("Mot de passe trop court (min. 6 caractères)");

  const btn = $("#btn-register");
  btn.disabled = true;
  btn.textContent = "Création du compte...";
  try {
    await API.register(name, phone, pass);
    await API.login(phone, pass);
    const me = await API.me();
    if (!me || !me.is_admin) {
      toast("Compte créé mais en attente d'approbation administrateur");
      await API.logout();
      showLogin(true);
      return;
    }
    CURRENT_ADMIN = me;
    showLogin(false);
    $("#admin-name").textContent = me.name || "Admin";
    toast("Compte Administrateur activé avec succès ✓");
    await refreshData();
  } catch (err) {
    toast(err.message || "Erreur de création de compte");
  } finally {
    btn.disabled = false;
    btn.textContent = "Créer mon accès administrateur";
  }
};

$("#btn-logout").onclick = async () => {
  await API.logout();
  CURRENT_ADMIN = null;
  showLogin(true);
};

// Filtres
$("#search-prod").oninput = renderProducts;
$("#filter-cat").onchange = renderProducts;

// Modal
$("#btn-add-product").onclick = openAddModal;
$("#modal-close").onclick = closeModal;
$("#modal-cancel").onclick = closeModal;

// Upload photo
$("#p_file").onchange = async ev => {
  const file = ev.target.files[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) return toast("Image trop lourde (4 Mo max)");

  const btn = $("#btn-save-product");
  btn.disabled = true;
  btn.textContent = "Téléversement de la photo...";
  try {
    const url = await API.uploadImage(file);
    $("#p_img_url").value = url;
    $("#img-preview").innerHTML = `<img src="${esc(url)}" style="max-height:80px;border-radius:6px;border:1px solid var(--border)">`;
    toast("Photo téléchargée avec succès ✓");
  } catch (err) {
    toast("Erreur d'envoi de l'image : " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Enregistrer l'article";
  }
};

// Sauvegarde Produit
$("#form-product").onsubmit = async ev => {
  ev.preventDefault();
  const btn = $("#btn-save-product");
  btn.disabled = true;
  btn.textContent = "Enregistrement...";

  try {
    const id = $("#p_id").value ? +$("#p_id").value : null;
    await API.saveProduct({
      id,
      name: $("#p_name").value.trim(),
      cat: $("#p_cat").value,
      emoji: $("#p_emoji").value.trim() || "📦",
      price: +$("#p_price").value || 0,
      old_price: +$("#p_old").value || 0,
      stock: +$("#p_stock").value || 0,
      display_order: +$("#p_order").value || 0,
      active: $("#p_active").value === "true",
      img_url: $("#p_img_url").value || null,
      descr: $("#p_desc").value.trim(),
    });
    toast(id ? "Article mis à jour ✓" : "Nouvel article ajouté ✓");
    closeModal();
    await refreshData();
  } catch (err) {
    toast("Erreur : " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Enregistrer l'article";
  }
};

// Navigation menu gauche
$$(".menu button[data-view]").forEach(b => {
  b.onclick = () => {
    $$(".menu button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    const v = b.dataset.view;
    $("#view-products").style.display = v === "products" ? "block" : "none";
    $("#view-users").style.display = v === "users" ? "block" : "none";
  };
});

// Lancement au chargement
window.addEventListener("DOMContentLoaded", init);
