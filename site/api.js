/* api.js — Couche Supabase unifiée AL-Phone */
const SUPABASE_URL     = "https://xcnbergspbpurzsbksgs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_a6D6IwgEyC8FyPWaZfQdDA_LBKDJYd8";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const cleanPhone = input => {
  const str = String(input || "").trim();
  if (str.includes("@")) return str.toLowerCase();
  let digits = str.replace(/\D/g, "");
  if (digits.length === 8) digits = "227" + digits;
  return digits + "@clients.al-phone.app";
};

const API = {
  /* ── Authentification ────────────────────────────── */
  async login(phoneOrEmail, password) {
    const email = cleanPhone(phoneOrEmail);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (/invalid login credentials/i.test(error.message)) {
        throw new Error("Numéro ou mot de passe incorrect. Si vous n'avez pas encore défini de mot de passe, cliquez sur 'Créer / Réinitialiser mon mot de passe'.");
      }
      throw new Error(error.message);
    }
    return data.user;
  },

  async register(name, phoneOrEmail, password) {
    const email = cleanPhone(phoneOrEmail);
    let digits = String(phoneOrEmail || "").replace(/\D/g, "");
    if (digits.length === 8) digits = "+227" + digits;
    else if (!digits.startsWith("+") && digits.length > 0) digits = "+" + digits;

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name, phone: digits || "+22791038061" } },
    });
    if (error) {
      if (/already|registered/i.test(error.message)) {
        throw new Error("Ce numéro est déjà inscrit. Connectez-vous avec votre mot de passe.");
      }
      throw new Error(error.message);
    }
    return data.user;
  },

  logout: () => sb.auth.signOut(),

  async me() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    let { data } = await sb.from("profiles").select("id,name,phone,is_admin,blocked").eq("id", user.id).maybeSingle();

    const isOwner = (user.email && user.email.includes("91038061")) ||
                    (user.user_metadata?.phone && user.user_metadata.phone.includes("91038061"));

    // Création automatique du profil s'il n'existe pas encore
    if (!data) {
      const newProf = {
        id: user.id,
        name: user.user_metadata?.name || "Directeur AL-Phone",
        phone: user.user_metadata?.phone || "+22791038061",
        is_admin: true, // Le compte connecté reçoit les droits admin
      };
      await sb.from("profiles").upsert(newProf);
      data = newProf;
    } else if (isOwner && !data.is_admin) {
      await sb.from("profiles").update({ is_admin: true }).eq("id", user.id);
      data.is_admin = true;
    }

    if (data.blocked) { await sb.auth.signOut(); return null; }
    return data;
  },

  /* ── Catalogue public (articles actifs uniquement) ── */
  async products() {
    const { data, error } = await sb.from("products")
      .select("*, reviews(author,rating,body,created_at)")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("created_at",    { ascending: false });
    if (error) throw error;
    return (data || []).map(p => ({
      id:       p.id,
      name:     p.name,
      cat:      p.cat,
      price:    p.price,
      old:      p.old_price,
      stock:    p.stock,
      sold:     p.sold,
      emoji:    p.emoji,
      img:      p.img_url || "",
      desc:     p.descr,
      active:   p.active,
      order:    p.display_order || 0,
      comments: (p.reviews || []).map(r => ({ u: r.author, t: r.body, r: r.rating, d: r.created_at.slice(0, 10) })),
    }));
  },

  /* ── Tous les produits (Admin) ────────────────────── */
  async allProducts() {
    const { data, error } = await sb.from("products")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at",    { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveProduct(p) {
    const row = {
      name: p.name,
      cat: p.cat,
      price: Math.max(0, +p.price || 0),
      old_price: Math.max(0, +p.old_price || 0),
      stock: Math.max(0, +p.stock || 0),
      emoji: p.emoji || "📦",
      img_url: p.img_url || null,
      descr: p.descr || "",
      display_order: +p.display_order || 0,
      active: p.active !== false,
    };
    const q = p.id ? sb.from("products").update(row).eq("id", p.id)
                   : sb.from("products").insert(row);
    const { error } = await q;
    if (error) throw error;
  },

  async deleteProduct(id) {
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) throw error;
  },

  async toggleActive(id, active) {
    const { error } = await sb.from("products").update({ active }).eq("id", id);
    if (error) throw error;
  },

  /* ── Gestion des utilisateurs ─────────────────────── */
  async users() {
    const { data, error } = await sb.from("profiles")
      .select("id,name,phone,is_admin,blocked,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async setUser(id, patch) {
    const { error } = await sb.from("profiles").update(patch).eq("id", id);
    if (error) throw error;
  },

  async deleteUser(id) {
    const { error } = await sb.from("profiles").delete().eq("id", id);
    if (error) throw error;
  },

  /* ── Upload d'images ──────────────────────────────── */
  async uploadImage(file) {
    const cleanName = file.name.replace(/[^\w.]/g, "_");
    const path = `${Date.now()}_${cleanName}`;
    const { error } = await sb.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  },
};
