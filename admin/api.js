/* api.js — Couche Supabase pour l'espace d'administration AL-Phone */
const SUPABASE_URL      = "https://xcnbergspbpurzsbksgs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_a6D6IwgEyC8FyPWaZfQdDA_LBKDJYd8";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const cleanLogin = input => {
  const str = String(input || "").trim();
  if (!str) return "";
  // Si c'est déjà un email (ex: admin@al-phone.com)
  if (str.includes("@")) return str.toLowerCase();
  // Si c'est un numéro de téléphone
  let digits = str.replace(/\D/g, "");
  if (digits.length === 8) digits = "227" + digits;
  return digits + "@clients.al-phone.app";
};

const API = {
  /* ── Authentification ─────────────────────────────── */
  async login(identifier, password) {
    const email = cleanLogin(identifier);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Identifiant ou mot de passe incorrect");
    return data.user;
  },

  async register(name, identifier, password) {
    const email = cleanLogin(identifier);
    let digits = String(identifier || "").replace(/\D/g, "");
    if (digits.length === 8) digits = "+227" + digits;
    else if (digits.length > 0 && !digits.startsWith("+")) digits = "+" + digits;

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name, phone: digits || "+22791038061" } },
    });
    if (error) throw new Error(/already|registered/i.test(error.message) ? "Ce compte existe déjà" : error.message);
    return data.user;
  },

  async changePassword(newPassword) {
    const { data, error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return data;
  },

  logout: () => sb.auth.signOut(),

  async me() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    let { data } = await sb.from("profiles").select("id,name,phone,is_admin,blocked").eq("id", user.id).maybeSingle();
    
    const isOwner = (user.email && (user.email.includes("91038061") || user.email.includes("admin"))) ||
                    (user.user_metadata && user.user_metadata.phone &&
                     user.user_metadata.phone.includes("91038061"));

    if (!data) {
      const newProf = {
        id: user.id,
        name: user.user_metadata?.name || "Directeur AL-Phone",
        phone: user.user_metadata?.phone || "+22791038061",
        is_admin: true,
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

  /* ── Gestion des produits ─────────────────────────── */
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
      name:          p.name,
      cat:           p.cat,
      price:         Math.max(0, +p.price || 0),
      old_price:     Math.max(0, +p.old_price || 0),
      stock:         Math.max(0, +p.stock || 0),
      emoji:         p.emoji || "📦",
      img_url:       p.img_url || null,
      descr:         p.descr || "",
      display_order: +p.display_order || 0,
      active:        p.active !== false,
    };
    const q = p.id
      ? sb.from("products").update(row).eq("id", p.id)
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
