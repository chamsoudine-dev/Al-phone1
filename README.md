# AL-Phone — Site vitrine catalogue

Site vitrine pour **AL-Phone Niamey** (téléphones, accessoires tech).  
Les visiteurs parcourent le catalogue et contactent la boutique via WhatsApp.

## Stack technique
- **Frontend** : HTML / CSS / JS vanilla (aucune dépendance sauf Supabase JS)
- **Base de données** : [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage)
- **Hébergement** : [Vercel](https://vercel.com)

## Structure
```
site/           → Pages HTML/JS/CSS déployées sur Vercel
supabase/
  schema.sql    → Tables, RLS, triggers (à exécuter dans Supabase SQL Editor)
tools/          → Outils optionnels (rapport CSV, import produits en masse)
```

## Mise en ligne

### 1. Supabase
1. Créez un projet sur [supabase.com](https://supabase.com).
2. SQL Editor → collez `supabase/schema.sql` → Run.
3. Storage → créez un bucket **public** `product-images`.
4. Copiez votre URL et clé `anon` dans `site/api.js`.

### 2. Vercel
Connectez le dépôt GitHub à Vercel. Le `vercel.json` est déjà configuré.

### 3. Premier admin
Inscrivez-vous sur le site, puis dans Supabase SQL Editor :
```sql
update public.profiles set is_admin = true where phone = '+22790000000';
```

## Licence
Usage privé — AL-Phone Niamey.
