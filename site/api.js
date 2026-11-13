/* api.js — Catalogue AL-Phone (lecture seule + espace admin)
   La clé "anon" est publique par conception ; la sécurité vient des règles RLS Supabase.
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
   <script src="api.js"></script> */

const SUPABASE_URL     = "https://xcnbergspbpurzsbksgs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_a6D6IwgEyC8FyPWaZfQdDA_LBKDJYd8";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const fakeEmail = phone => phone.replace(/\D/g, "") + "@clients.al-phone.app";

const API = {

  /* ── Authentification admin ─────────────────────────── */
  async login(phone, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email: fakeEmail(phone), password });
    if (error) throw new Error("Numéro ou mot de passe incorrect");
    return data.user;
  },
  async register(name, phone, password) {
    const { data, error } = await sb.auth.signUp({
      email: fakeEmail(phone), password,
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

  /* ── Catalogue (public, lecture seule) ──────────────── */
  async products() {
    const { data, error } = await sb.from("products")
      .select("*, reviews(author,rating,body,created_at)")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("created_at",    { ascending: false });
    if (error) throw error;
    return data.map(p => ({
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
      comments: p.reviews.map(r => ({ u: r.author, t: r.body, r: r.rating, d: r.created_at.slice(0, 10) })),
    }));
  },
  async addReview(productId, author, rating, body) {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("reviews").insert({ product_id: productId, user_id: user.id, author, rating, body });
    if (error) throw error;
  },

  /* ── Admin : gestion du catalogue ───────────────────── */
  async saveProduct(p) {
    const row = {
      name: p.name, cat: p.cat, price: p.price, old_price: p.old || 0,
      stock: p.stock, emoji: p.emoji, img_url: p.img || null,
      descr: p.desc, display_order: p.order || 0, active: p.active !== false,
    };
    const q = p.id ? sb.from("products").update(row).eq("id", p.id)
                   : sb.from("products").insert(row);
    const { error } = await q; if (error) throw error;
  },
  async deleteProduct(id) {
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) throw error;
  },
  async toggleActive(id, active) {
    const { error } = await sb.from("products").update({ active }).eq("id", id);
    if (error) throw error;
  },
  async reorderProducts(rows) {
    for (const r of rows) {
      const { error } = await sb.from("products").update({ display_order: r.order }).eq("id", r.id);
      if (error) throw error;
    }
  },

  /* ── Admin : gestion des utilisateurs ───────────────── */
  async users() {
    const { data, error } = await sb.from("profiles")
      .select("id,name,phone,is_admin,blocked,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async setUser(id, patch) {
    const { error } = await sb.from("profiles").update(patch).eq("id", id);
    if (error) throw error;
  },
  async deleteUser(id) {
    const { error } = await sb.from("profiles").delete().eq("id", id);
    if (error) throw error;
  },

  /* ── Upload d'image (admin) ──────────────────────────── */
  async uploadImage(file) {
    const path = Date.now() + "-" + file.name.replace(/[^\w.]/g, "_");
    const { error } = await sb.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  },
};
