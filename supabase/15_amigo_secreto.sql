-- ============================================================
-- RABBIT AI | Amigo secreto (listas de regalos, detalles y reacciones)
-- Pegar en Supabase > SQL Editor > New query > Run (se puede correr dos veces)
-- Se entra sin contraseña eligiendo tu nombre, por eso estas tablas aceptan cambios sin sesión.
-- ============================================================
create table if not exists public.as_listas (
  persona text primary key,
  regalos jsonb not null default '[]',
  detalles jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
create table if not exists public.as_reacciones (
  lista text not null,
  de text not null,
  reaccion text not null,
  created_at timestamptz not null default now(),
  primary key (lista, de)
);
alter table public.as_listas enable row level security;
alter table public.as_reacciones enable row level security;

drop policy if exists as_listas_ver on public.as_listas;
drop policy if exists as_listas_crear on public.as_listas;
drop policy if exists as_listas_editar on public.as_listas;
drop policy if exists as_reac_ver on public.as_reacciones;
drop policy if exists as_reac_crear on public.as_reacciones;
drop policy if exists as_reac_editar on public.as_reacciones;
drop policy if exists as_reac_borrar on public.as_reacciones;
create policy as_listas_ver on public.as_listas for select to anon, authenticated using (true);
create policy as_listas_crear on public.as_listas for insert to anon, authenticated with check (true);
create policy as_listas_editar on public.as_listas for update to anon, authenticated using (true) with check (true);
create policy as_reac_ver on public.as_reacciones for select to anon, authenticated using (true);
create policy as_reac_crear on public.as_reacciones for insert to anon, authenticated with check (true);
create policy as_reac_editar on public.as_reacciones for update to anon, authenticated using (true) with check (true);
create policy as_reac_borrar on public.as_reacciones for delete to anon, authenticated using (true);

do $$ begin
  alter publication supabase_realtime add table public.as_listas, public.as_reacciones;
exception when duplicate_object then null; end $$;

-- Fotos de los regalos
insert into storage.buckets (id, name, public) values ('amigo-secreto', 'amigo-secreto', true)
on conflict (id) do update set public = true;
drop policy if exists as_fotos_ver on storage.objects;
drop policy if exists as_fotos_subir on storage.objects;
create policy as_fotos_ver on storage.objects for select to anon, authenticated using (bucket_id = 'amigo-secreto');
create policy as_fotos_subir on storage.objects for insert to anon, authenticated with check (bucket_id = 'amigo-secreto');
