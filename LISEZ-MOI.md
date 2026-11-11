# Ma Boutique Tech — site + back-end (Supabase + CinetPay)

## Contenu du dossier
- `site/` : le site (index.html, app.js, api.js), à héberger sur Netlify, Vercel ou GitHub Pages.
- `supabase/schema.sql` : tables, règles de sécurité (RLS), produits de départ.
- `supabase/functions/create-order` : recalcule prix, stock et frais côté serveur, lance le paiement CinetPay.
- `supabase/functions/cinetpay-notify` : reçoit la notification CinetPay, revérifie le paiement, valide la commande.

## Installation (dans cet ordre)

### 1. Supabase
1. Créez un projet sur supabase.com.
2. Authentication > Providers > Email : désactivez « Confirm email ».
3. SQL Editor : collez le contenu de `supabase/schema.sql`, puis Run.
4. Storage : créez un bucket **public** nommé `product-images`, avec une politique d'envoi (INSERT) réservée aux admins : `(select is_admin from profiles where id = auth.uid())`.
5. Project Settings > API : copiez l'URL du projet et la clé `anon` dans `site/api.js` (SUPABASE_URL et SUPABASE_ANON_KEY).

### 2. CinetPay
Créez un compte marchand sur cinetpay.com, notez votre API Key et votre Site ID. Commencez en sandbox.

### 3. Fonctions serveur (Supabase CLI), depuis la racine de ce dossier
```
npm i -g supabase
supabase login
supabase link --project-ref VOTRE-REF
supabase secrets set CINETPAY_APIKEY=xxx CINETPAY_SITE_ID=xxx SITE_URL=https://adresse-de-votre-site
supabase functions deploy create-order
supabase functions deploy cinetpay-notify --no-verify-jwt
```
La CLI cherche les fonctions dans `supabase/functions` : le dossier est déjà organisé ainsi.

### 4. Site
1. Dans `site/app.js`, modifiez le bloc CONFIG en haut (nom, WhatsApp au format 22507000000, réseaux sociaux).
2. Envoyez le dossier `site/` sur Netlify (glisser-déposer sur app.netlify.com/drop).
3. Mettez l'adresse obtenue dans le secret `SITE_URL` (étape 3), puis redéployez `create-order`.
4. Ouvrez le site, créez votre compte, puis dans le SQL Editor :
   `update public.profiles set is_admin = true where phone = '+225XXXXXXXXXX';`
   L'administration est ensuite sur `#admin`.

## Outils optionnels (Python, Go, Rust)
Ils ne sont pas nécessaires au fonctionnement du site. Chacun a un rôle précis.

| Outil | Dossier | Rôle |
|---|---|---|
| Python | `tools/python/rapport_ventes.py` | Rapport de ventes (CA, panier moyen, meilleures ventes), alertes de stock bas, export CSV pour Excel. Sans dépendance. |
| Go | `services/go-notify` | Webhook CinetPay alternatif à la fonction Supabase, avec limite de requêtes par IP. À déployer sur Render, Fly.io ou un VPS (Dockerfile fourni). |
| Rust | `tools/rust-import` | Import de dizaines de produits depuis un CSV, avec validation ligne par ligne. |

Ces outils utilisent la clé `service_role` de Supabase : gardez-la sur votre ordinateur ou serveur, jamais dans `site/`.

- Python : `SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 tools/python/rapport_ventes.py --jours 7`
- Rust : `cd tools/rust-import && cargo run --release -- produits.csv`
- Go : `cd services/go-notify && go build -o notify . && ./notify` (variables : SUPABASE_URL, SUPABASE_SERVICE_KEY, CINETPAY_APIKEY, CINETPAY_SITE_ID). Pour l'utiliser à la place de la fonction Supabase : `supabase secrets set NOTIFY_URL=https://votre-service/notify`, puis redéployez `create-order`.

## Sécurité en place
- Comptes et mots de passe gérés et hachés par Supabase Auth.
- Le navigateur ne peut pas créer de commande : seul `create-order` le peut, avec les prix lus en base.
- Un paiement n'est validé que si CinetPay confirme `ACCEPTED` avec le bon montant.
- Un utilisateur ne peut pas devenir admin ni voir les commandes des autres.

## À vérifier avant la mise en ligne
- Faites un paiement test en sandbox et contrôlez que `orders.payment_status` passe à `PAID`.
- Vérifiez dans docs.cinetpay.com le statut de succès et les champs client exigés pour les cartes.
- Panier et wishlist restent sur l'appareil du client (pas enregistrés sur le serveur).
- Pas de réinitialisation du mot de passe par e-mail : prévoyez-la via l'admin Supabase.
