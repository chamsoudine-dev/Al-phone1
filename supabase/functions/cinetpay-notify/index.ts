// Supabase Edge Function : cinetpay-notify (webhook appelé par CinetPay)
// Déployer avec --no-verify-jwt. On ne fait JAMAIS confiance au contenu reçu :
// on interroge l'API de vérification de CinetPay, puis on compare le montant.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  let transId = "";
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) transId = String((await req.json()).cpm_trans_id ?? "");
    else transId = String((await req.formData()).get("cpm_trans_id") ?? "");
  } catch { /* corps vide */ }
  if (!/^MBT-[A-Z0-9]{6,30}$/.test(transId)) return new Response("ignored");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await admin.from("orders").select("id,total,payment_status").eq("id", transId).single();
  if (!order || order.payment_status === "PAID") return new Response("ok");

  const r = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: Deno.env.get("CINETPAY_APIKEY"),
      site_id: Deno.env.get("CINETPAY_SITE_ID"),
      transaction_id: transId,
    }),
  });
  const res = await r.json().catch(() => null);
  const d = res?.data;
  if (!d) return new Response("check failed", { status: 502 }); // CinetPay réessaiera

  if (d.status === "ACCEPTED" && Number(d.amount) === order.total && d.currency === "XOF") {
    await admin.rpc("finalize_order", { p_id: transId, p_status: "PAID" });
  } else if (d.status === "REFUSED") {
    await admin.from("orders").update({ payment_status: "FAILED" }).eq("id", transId).eq("payment_status", "PENDING");
  }
  return new Response("ok");
});
