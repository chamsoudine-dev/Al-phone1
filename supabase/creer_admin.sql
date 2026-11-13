-- ================================================================
-- Script de création immédiate du compte Administrateur de départ
-- À exécuter dans Supabase > SQL Editor > Run
-- ================================================================

create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid;
begin
  -- 1. Chercher si l'utilisateur existe déjà avec cet email
  select id into v_user_id from auth.users where email = 'admin@al-phone.com';

  if v_user_id is null then
    -- Création du compte avec confirmation directe (aucun envoi d'email requis)
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin@al-phone.com',
      crypt('Admin123456!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Directeur AL-Phone","phone":"+22791038061"}',
      now(),
      now()
    );
  else
    -- Si le compte existe déjà, réinitialiser le mot de passe sur Admin123456!
    update auth.users
    set encrypted_password = crypt('Admin123456!', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = '{"name":"Directeur AL-Phone","phone":"+22791038061"}'
    where id = v_user_id;
  end if;

  -- 2. Créer ou mettre à jour le profil avec les droits Super-Admin
  insert into public.profiles (id, name, phone, is_admin, blocked)
  values (v_user_id, 'Directeur AL-Phone', '+22791038061', true, false)
  on conflict (id) do update set is_admin = true, blocked = false;

end $$;
