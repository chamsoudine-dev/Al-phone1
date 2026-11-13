// Supabase Edge Function : create-order
// Recalcule TOUT côté serveur (prix, stock, frais) puis initialise le paiement CinetPay.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode refusée" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "Connexion requise" }, 401);
  const { data: prof } = await admin.from("profiles").select("is_admin,blocked").eq("id", user.id).single();
  if (prof?.blocked) return json({ error: "Compte désactivé" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }
  const { items, address, pay } = body ?? {};
  const methods = ["cinetpay", "cod"];
  if (!Array.isArray(items) || !items.length || items.length > 30) return json({ error: "Panier invalide" }, 400);
  if (!methods.includes(pay)) return json({ error: "Mode de paiement invalide" }, 400);
  const a = address ?? {};
  const clean = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const addr = { name: clean(a.name, 60), phone: clean(a.phone, 20), city: clean(a.city, 60), area: clean(a.area, 120) };
  if (!addr.name || !addr.city || !addr.area || !/^\+?[0-9 ]{8,16}$/.test(addr.phone))
    return json({ error: "Adresse incomplète" }, 400);

  // Prix et stock lus en base : on ignore tout prix envoyé par le navigateur
  const ids = items.map((i: any) => Number(i.id));
  const { data: prods } = await admin.from("products").select("id,name,price,stock,emoji,active").in("id", ids);
  const lines: any[] = [];
  let subtotal = 0;
  for (const it of items) {
    const p = prods?.find((x) => x.id === Number(it.id));
    const qty = Number(it.qty);
    if (!p || !p.active || !Number.isInteger(qty) || qty < 1 || qty > p.stock || p.price <= 0)
      return json({ error: `Article indisponible : ${p?.name ?? it.id}` }, 409);
    subtotal += p.price * qty;
    lines.push({ id: p.id, name: p.name, price: p.price, qty, emoji: p.emoji });
  }
  const shipping = subtotal >= 50000 ? 0 : 1500;
  const total = Math.ceil((subtotal + shipping) / 5) * 5; // CinetPay exige un multiple de 5
  const orderId = "MBT-" + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0, 4).toUpperCase();

  const { error } = await admin.from("orders").insert({
    id: orderId, user_id: user.id, items: lines, subtotal, shipping, total,
    pay_method: pay, address: addr,
  });
  if (error) return json({ error: "Enregistrement impossible" }, 500);

  if (pay === "cod") {
    await admin.rpc("finalize_order", { p_id: orderId, p_status: "COD" });
    return json({ orderId, total });
  }

  const site = Deno.env.get("SITE_URL")!;
  const r = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: Deno.env.get("CINETPAY_APIKEY"),
      site_id: Deno.env.get("CINETPAY_SITE_ID"),
      transaction_id: orderId,
      amount: total,
      currency: "XOF",
      description: "Commande " + orderId.replace(/[^A-Z0-9 ]/g, ""),
      notify_url: Deno.env.get("NOTIFY_URL") ?? `${url}/functions/v1/cinetpay-notify`,
      return_url: `${site}/#orders`,
      channels: "ALL",
      lang: "fr",
      customer_id: user.id,
      customer_name: addr.name.split(" ")[0] || "Client",
      customer_surname: addr.name.split(" ").slice(1).join(" ") || "Client",
      customer_phone_number: addr.phone,
      customer_email: user.email ?? "client@exemple.com",
      customer_address: addr.area,
      customer_city: addr.city,
      customer_country: Deno.env.get("CINETPAY_COUNTRY") ?? (addr.phone.startsWith("+227") ? "NE" : "CI"),
      customer_state: Deno.env.get("CINETPAY_COUNTRY") ?? (addr.phone.startsWith("+227") ? "NE" : "CI"),
      customer_zip_code: Deno.env.get("CINETPAY_ZIP") ?? (addr.phone.startsWith("+227") ? "00227" : "00225"),
    }),
  });
  const res = await r.json().catch(() => ({}));
  const payUrl = res?.data?.payment_url;
  if (!payUrl) {
    await admin.from("orders").update({ payment_status: "FAILED" }).eq("id", orderId);
    return json({ error: "Paiement indisponible, réessayez", detail: res?.description ?? res?.message }, 502);
  }
  return json({ orderId, total, payment_url: payUrl });
});
