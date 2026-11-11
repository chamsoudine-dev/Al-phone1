#!/usr/bin/env python3
"""Rapport de ventes + alertes de stock pour Ma Boutique Tech.

Usage :
  export SUPABASE_URL=https://xxxx.supabase.co
  export SUPABASE_SERVICE_KEY=...        # clé "service_role" : à garder secrète, jamais dans le site
  python3 rapport_ventes.py --jours 7 --seuil-stock 5 [--whatsapp 22507000000]

Sort un résumé à l'écran et un fichier CSV des commandes payées. Aucune dépendance (bibliothèque standard).
"""
import argparse, csv, json, os, sys, urllib.parse, urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


def get(path):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}", headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def fcfa(n):
    return f"{int(n):,}".replace(",", " ") + " FCFA"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jours", type=int, default=7)
    ap.add_argument("--seuil-stock", type=int, default=5)
    ap.add_argument("--whatsapp", help="numéro (indicatif inclus) pour générer un lien d'envoi du résumé")
    a = ap.parse_args()
    if not URL or not KEY:
        sys.exit("Définissez SUPABASE_URL et SUPABASE_SERVICE_KEY.")

    depuis = (datetime.now(timezone.utc) - timedelta(days=a.jours)).isoformat()
    q = urllib.parse.quote(depuis)
    commandes = get(f"orders?created_at=gte.{q}&payment_status=in.(PAID,COD)&order=created_at.desc&select=*")
    produits = get("products?select=name,stock&order=stock.asc")

    ca = sum(c["total"] for c in commandes)
    ventes = Counter()
    for c in commandes:
        for it in c["items"]:
            ventes[it["name"]] += it["qty"]
    panier_moyen = ca / len(commandes) if commandes else 0
    bas = [p for p in produits if p["stock"] <= a.seuil_stock]

    lignes = [
        f"Rapport des {a.jours} derniers jours",
        f"Commandes : {len(commandes)} | Chiffre d'affaires : {fcfa(ca)} | Panier moyen : {fcfa(panier_moyen)}",
        "Meilleures ventes : " + (", ".join(f"{n} (x{q})" for n, q in ventes.most_common(3)) or "aucune"),
        "Stock bas : " + (", ".join(f"{p['name']} ({p['stock']})" for p in bas) or "RAS"),
    ]
    print("\n".join(lignes))

    nom = f"rapport-{datetime.now():%Y-%m-%d}.csv"
    with open(nom, "w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig : s'ouvre bien dans Excel
        w = csv.writer(f, delimiter=";")
        w.writerow(["commande", "date", "client", "téléphone", "ville", "paiement", "total", "articles"])
        for c in commandes:
            ad = c["address"]
            w.writerow([c["id"], c["created_at"][:10], ad.get("name"), ad.get("phone"), ad.get("city"),
                        c["payment_status"], c["total"], "; ".join(f"{i['name']} x{i['qty']}" for i in c["items"])])
    print(f"CSV : {nom}")
    if a.whatsapp:
        print("Lien WhatsApp : https://wa.me/" + a.whatsapp + "?text=" + urllib.parse.quote("\n".join(lignes)))


if __name__ == "__main__":
    main()
