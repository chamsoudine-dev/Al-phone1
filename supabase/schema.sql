-- Ma Boutique Tech — schéma Supabase
-- À coller dans Supabase > SQL Editor > Run

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  phone text not null unique check (phone ~ '^\+?[0-9]{8,16}$'),
  is_admin boolean not null default false,
  blocked boolean not null default false,   -- compte désactivé par l'admin : plus de connexion ni de commande
  created_at timestamptz not null default now()
);

create table public.products (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 120),
  cat text not null,
  price int not null check (price >= 0),
  old_price int not null default 0 check (old_price >= 0),
  stock int not null default 0 check (stock >= 0),
  sold int not null default 0,
  emoji text default '📦',
  img_url text,
  descr text not null default '',
  active boolean not null default true,
  display_order int not null default 0,     -- ordre d'affichage (0 = premier). 0 par défaut = date de création
  created_at timestamptz not null default now()
);

create table public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author text not null,
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 3 and 300),
  created_at timestamptz not null default now()
);

create table public.orders (
  id text primary key,
  user_id uuid not null references auth.users(id),
  items jsonb not null,
  subtotal int not null,
  shipping int not null,
  total int not null,
  pay_method text not null,
  address jsonb not null,
  status int not null default 0,              -- 0 reçue, 1 confirmée, 2 livraison, 3 livrée
  payment_status text not null default 'PENDING', -- PENDING | PAID | COD | FAILED
  created_at timestamptz not null default now()
);

-- Module Trocs & Reprises (spécifique AL-Phone Niamey)
create table public.trocs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  phone text not null,
  phone_model text not null,     -- Modèle du téléphone proposé (ex: iPhone 11, Samsung A12)
  condition text not null,       -- État (Bon, Écran fissuré, Neuf, etc.)
  descr text not null default '',
  img_url text,                  -- Photo du téléphone proposée par le client
  status text not null default 'PENDING', -- PENDING (en attente), ACCEPTED (offre faite), REJECTED (refusé)
  offer_price int default 0,     -- Prix de reprise estimé par AL-Phone
  created_at timestamptz not null default now()
);

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name, phone)
  values (new.id, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- Finalisation d'une commande (idempotente) : appelée UNIQUEMENT par les fonctions serveur
create or replace function public.finalize_order(p_id text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders; it jsonb;
begin
  select * into o from public.orders where id = p_id for update;
  if not found or o.payment_status in ('PAID','COD') then return; end if;
  update public.orders set payment_status = p_status, status = 1 where id = p_id;
  for it in select * from jsonb_array_elements(o.items) loop
    update public.products
       set stock = greatest(0, stock - (it->>'qty')::int),
           sold  = sold + (it->>'qty')::int
     where id = (it->>'id')::bigint;
  end loop;
end $$;
revoke all on function public.finalize_order(text, text) from public, anon, authenticated;

-- Sécurité ligne par ligne (RLS)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.reviews  enable row level security;
alter table public.orders   enable row level security;

create policy "profil: lecture perso ou admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profil: modif perso" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;   -- is_admin et phone non modifiables par le user

-- L'admin peut lire, modifier (is_admin, blocked) et supprimer n'importe quel profil
create policy "profil: admin full" on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

create policy "produits: lecture publique" on public.products for select
  using (active or public.is_admin());
create policy "produits: admin écrit" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

create policy "avis: lecture publique" on public.reviews for select using (true);
create policy "avis: connecté publie" on public.reviews for insert
  with check (user_id = auth.uid());
create policy "avis: admin supprime" on public.reviews for delete using (public.is_admin());

-- Commandes : aucun INSERT côté client (création uniquement via la fonction create-order)
create policy "commandes: lecture perso ou admin" on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
create policy "commandes: admin change le statut" on public.orders for update
  using (public.is_admin()) with check (public.is_admin());
revoke update on public.orders from authenticated;
grant update (status) on public.orders to authenticated;   -- limité à l'admin par la policy

-- Trocs : le client crée et lit ses trocs, l'admin gère tout
alter table public.trocs enable row level security;
create policy "trocs: lecture perso ou admin" on public.trocs for select using (user_id = auth.uid() or public.is_admin());
create policy "trocs: insert client" on public.trocs for insert with check (user_id = auth.uid());
create policy "trocs: admin modif" on public.trocs for update using (public.is_admin()) with check (public.is_admin());
create policy "trocs: admin supprime" on public.trocs for delete using (public.is_admin());

-- Produits de départ
insert into public.products (name, cat, price, old_price, stock, sold, emoji, descr) values
 ('Smartphone Android 128 Go — Écran 6,5"','Téléphones',85000,95000,5,12,'📱','Écran 6,5 pouces HD+, 128 Go, double SIM, 5000 mAh. Neuf, garanti 6 mois.'),
 ('Pochette silicone souple (multicolore)','Pochettes',2500,0,40,58,'🧴','Pochette fine et colorée en silicone souple.'),
 ('Coque antichoc renforcée coins','Antichocs',4000,0,25,31,'🛡️','Coins renforcés, résiste aux chutes de 2 m.'),
 ('Lampe LED rechargeable USB','Lampes',6500,8000,15,22,'💡','Rechargeable USB, 8 h d’autonomie, 3 intensités.'),
 ('Écouteurs Bluetooth avec micro','Numérique',12000,0,10,17,'🎧','Son clair, boîtier de charge, autonomie 20 h.');

-- Après votre inscription sur le site, vous passez admin avec (remplacez le numéro) :
-- update public.profiles set is_admin = true where phone = '+2250700000000';
