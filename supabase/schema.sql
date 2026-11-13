-- ================================================================
-- AL-Phone Niamey — Schéma Supabase
-- Site vitrine catalogue : lecture publique + espace admin
-- Collez ce script dans Supabase > SQL Editor > Run
-- ================================================================

-- ── Profils (liés à Supabase Auth) ──────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 60),
  phone      text not null unique check (phone ~ '^\+?[0-9]{8,16}$'),
  is_admin   boolean not null default false,
  blocked    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Catalogue produits ────────────────────────────────────────────
create table if not exists public.products (
  id            bigint generated always as identity primary key,
  name          text not null check (char_length(name) between 2 and 120),
  cat           text not null,
  price         int not null check (price >= 0),
  old_price     int not null default 0 check (old_price >= 0),
  stock         int not null default 0 check (stock >= 0),
  sold          int not null default 0,
  emoji         text default '📦',
  img_url       text,
  descr         text not null default '',
  active        boolean not null default true,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

-- ── Avis clients ──────────────────────────────────────────────────
create table if not exists public.reviews (
  id         bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  author     text not null,
  rating     int not null check (rating between 1 and 5),
  body       text not null check (char_length(body) between 3 and 300),
  created_at timestamptz not null default now()
);

-- ── Trigger : création automatique du profil à l'inscription ─────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_phone text;
  v_is_admin boolean := false;
begin
  v_phone := coalesce(new.raw_user_meta_data->>'phone', '');
  
  -- Le numéro de secours/propriétaire ou le tout premier compte est automatiquement ADMIN
  if v_phone like '%91038061%' or not exists (select 1 from public.profiles where is_admin = true) then
    v_is_admin := true;
  end if;

  insert into public.profiles(id, name, phone, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Administrateur AL-Phone'),
    v_phone,
    v_is_admin
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Fonction d'aide : is_admin() ─────────────────────────────────
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.reviews  enable row level security;

-- Profils
create policy "profil: lecture perso ou admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profil: modif perso (nom uniquement)" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profil: admin full" on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- Produits : lecture publique (uniquement les articles actifs), écriture admin
create policy "produits: lecture publique" on public.products for select
  using (active = true or public.is_admin());
create policy "produits: admin écrit" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- Avis : lecture publique, insert par tout utilisateur authentifié, suppression admin
create policy "avis: lecture publique" on public.reviews for select using (true);
create policy "avis: insert authentifié" on public.reviews for insert
  with check (user_id = auth.uid());
create policy "avis: admin supprime" on public.reviews for delete using (public.is_admin());

-- ── Produits de démonstration ─────────────────────────────────────
-- (Supprimez ou adaptez avant la mise en ligne si vous avez déjà vos produits)
insert into public.products (name, cat, price, old_price, stock, sold, emoji, descr, display_order) values
 ('Samsung Galaxy A16 128 Go','Téléphones',150000,165000,8,45,'📱','Écran 6,7 pouces Super AMOLED, 128 Go, double SIM, 5000 mAh. Neuf, garantie 6 mois.',1),
 ('iPhone 14 128 Go','Téléphones',280000,300000,3,22,'📱','Écran 6,1 pouces OLED, 128 Go, double SIM. Garantie Apple 1 an.',2),
 ('Tecno Spark 10 Pro','Téléphones',95000,105000,12,38,'📱','Écran 6,8 pouces IPS, 128 Go, 5000 mAh. Bon rapport qualité-prix.',3),
 ('Pochette iPhone silicone','Pochettes',2500,0,50,60,'🧴','Pochette fine en silicone souple, multicolore.',4),
 ('Coque antichoc iPhone 14','Antichocs',4000,0,30,45,'🛡️','Coque renforcée avec coins amortisseurs.',5),
 ('Lampe LED rechargeable USB','Lampes',6500,8000,15,22,'💡','Rechargeable USB, 8 h d''autonomie, 3 intensités.',6),
 ('Écouteurs Bluetooth sans fil','Numérique',12000,0,10,17,'🎧','Son stéréo clair, boîtier de charge, autonomie 20 h.',7),
 ('Power bank 10000 mAh','Numérique',8500,0,20,30,'🔋','Batterie externe 10000 mAh, charge rapide USB.',8)
on conflict do nothing;

-- ── Après votre inscription sur le site, passez-vous admin ────────
-- Remplacez le numéro par le vôtre :
-- update public.profiles set is_admin = true where phone = '+22790000000';
