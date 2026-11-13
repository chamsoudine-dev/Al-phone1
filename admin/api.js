/* api.js — Couche Supabase pour l'espace d'administration AL-Phone */
const SUPABASE_URL     = "https://xcnbergspbpurzsbksgs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_a6D6IwgEyC8FyPWaZfQdDA_LBKDJYd8";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const fakeEmail = phone => phone.replace(/\D/g, "") + "@clients.al-phone.app";

const API = {
  /* ── Authentification ────────────────────────────── */
  async login(phone, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email: fakeEmail(phone), password });
    if (error) throw new Error("Numéro ou mot de passe incorrect");
    return data.user;
  },

  async register(name, phone, password) {
    const { data, error } = await sb.auth.signUp({
      email: fakeEmail(phone),
      password,
      options: { data: { name, phone } },
    });
    if (error) throw new Error(/already|registered/i.test(error.message) ? "Ce numéro est déjà inscrit" : error.message);
    return data.user;
  },

  logout: () => sb.auth.signOut(),

  async me() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from("profiles").select("id,name,phone,is_admin,blocked").eq("id", user.id).single();
    if (!data || data.blocked) { await sb.auth.signOut(); return null; }
    return data;
  },

  /* ── Gestion des produits (Tous, actifs et masqués) ── */
  async allProducts() {
    const { data, error } = await sb.from("products")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
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
    const query = p.id ? sb.from("products").update(row).eq("id", p.id)
                       : sb.from("products").insert(row);
    const { error } = await query;
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

  async updateOrder(id, order) {
    const { error } = await sb.from("products").update({ display_order: order }).eq("id", id);
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

  /* ── Téléversement d'image dans Supabase Storage ──── */
  async uploadImage(file) {
    const cleanName = file.name.replace(/[^\w.]/g, "_");
    const path = `${Date.now()}_${cleanName}`;
    const { error } = await sb.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  },
};
