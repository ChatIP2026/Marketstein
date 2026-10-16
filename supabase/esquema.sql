-- ============================================================
-- RABBIT AI | Estructura completa de la base de datos
-- Pegar TODO en Supabase > SQL Editor > New query > Run
-- Se puede volver a ejecutar: borra y recrea las tablas de Rabbit
-- (OJO: borra los datos de prueba de proyectos/tareas anteriores)
-- ============================================================

create extension if not exists pgcrypto;

drop table if exists public.puntaje_manual cascade;
drop table if exists public.tickets cascade;
drop table if exists public.tareas cascade;
drop table if exists public.proyectos cascade;
drop table if exists public.perfiles cascade;

-- ---------- Personas (una fila por cuenta de Rabbit) ----------
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null default '',
  usuario text not null unique check (usuario ~ '^[a-z0-9._]{3,20}$'),
  correo text not null unique,
  area text not null default 'Marketing',
  rol text not null default 'equipo' check (rol in ('jefa', 'equipo', 'solicitante')),
  admin_personas boolean not null default false,   -- puede ver y gestionar Personas
  carpeta text,
  activa boolean not null default true,
  debe_cambiar_clave boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Proyectos y tareas ----------
create table public.proyectos (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 200),
  estado text not null default 'sin_empezar' check (estado in ('sin_empezar', 'en_curso', 'listo')),
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  encargados uuid[] not null default '{}',
  fecha_limite date,
  creado_por uuid references public.perfiles(id) on delete set null,
  ticket_id bigint,
  created_at timestamptz not null default now()
);

create table public.tareas (
  id bigint generated always as identity primary key,
  proyecto_id bigint not null references public.proyectos(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  encargado uuid references public.perfiles(id) on delete set null,
  hecha boolean not null default false,
  hecha_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.tareas (proyecto_id);

-- ---------- Tickets (pedidos de otras áreas) ----------
create table public.tickets (
  id bigint generated always as identity primary key,
  titulo text not null,
  solicitante uuid not null references public.perfiles(id) on delete cascade,
  tipo text not null,
  formato text not null default '',
  detalle text not null default '',
  destino text not null default '',
  texto text not null default '',
  refs text[] not null default '{}',
  archivos jsonb not null default '[]',      -- [{n, tipo, ruta}] en Storage "adjuntos"
  fecha date not null,
  estado text not null default 'revision_inicial'
    check (estado in ('revision_inicial', 'falta_info', 'en_revision', 'en_curso', 'entregado', 'rechazado', 'cancelado')),
  prioridad text check (prioridad in ('urgente', 'alta', 'media', 'baja')),
  asignado uuid references public.perfiles(id) on delete set null,
  entregable text,
  proyecto_id bigint references public.proyectos(id) on delete set null,
  historial jsonb not null default '[]',
  comentarios jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index on public.tickets (solicitante);
create index on public.tickets (asignado);

-- ---------- Puntaje que se llena a mano (Dashboard) ----------
create table public.puntaje_manual (
  mes text not null,                          -- 'AAAA-MM'
  perfil uuid not null references public.perfiles(id) on delete cascade,
  tardanzas int not null default 0,
  vestimenta numeric not null default 20,
  primary key (mes, perfil)
);

-- ============================================================
-- Funciones de ayuda
-- ============================================================
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as
$$ select rol from public.perfiles where id = auth.uid() and activa $$;

create or replace function public.es_marketing() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.mi_rol() in ('jefa', 'equipo'), false) $$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select admin_personas or rol = 'jefa' from public.perfiles where id = auth.uid() and activa), false) $$;

-- Login con usuario: devuelve el correo de ese usuario (solo si la cuenta está activa)
create or replace function public.correo_de_usuario(u text) returns text
language sql stable security definer set search_path = public as
$$ select correo from public.perfiles where usuario = lower(trim(u)) and activa $$;
grant execute on function public.correo_de_usuario(text) to anon, authenticated;

-- Crear una persona (solo Personas). La primera vez, sin nadie creado, se permite para la cuenta inicial.
create or replace function public.crear_persona(
  p_nombre text, p_apellido text, p_usuario text, p_correo text,
  p_area text, p_rol text, p_clave text, p_admin boolean default false, p_carpeta text default null
) returns uuid
language plpgsql security definer set search_path = public, auth, extensions as
$$
declare nuevo uuid := gen_random_uuid();
begin
  if exists (select 1 from public.perfiles) and not public.es_admin() then
    raise exception 'No tienes permiso para crear cuentas';
  end if;
  if exists (select 1 from auth.users where email = lower(p_correo)) then
    raise exception 'Ya existe una cuenta con ese correo';
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', nuevo, 'authenticated', 'authenticated', lower(p_correo),
    crypt(p_clave, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nombre', p_nombre), now(), now(), '', '', '', '');
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), nuevo::text, nuevo, jsonb_build_object('sub', nuevo::text, 'email', lower(p_correo)),
    'email', now(), now(), now());
  insert into public.perfiles (id, nombre, apellido, usuario, correo, area, rol, admin_personas, carpeta)
  values (nuevo, p_nombre, coalesce(p_apellido, ''), lower(p_usuario), lower(p_correo), p_area, p_rol, coalesce(p_admin, false), p_carpeta);
  return nuevo;
end $$;
grant execute on function public.crear_persona(text, text, text, text, text, text, text, boolean, text) to authenticated, anon;

-- Restablecer contraseña de otra persona (solo Personas)
create or replace function public.restablecer_clave(p_id uuid, p_clave text) returns void
language plpgsql security definer set search_path = public, auth, extensions as
$$
begin
  if not public.es_admin() then raise exception 'No tienes permiso'; end if;
  update auth.users set encrypted_password = crypt(p_clave, gen_salt('bf')), updated_at = now() where id = p_id;
  update public.perfiles set debe_cambiar_clave = true where id = p_id;
end $$;
grant execute on function public.restablecer_clave(uuid, text) to authenticated;

-- La propia persona marca que ya creó su contraseña
create or replace function public.clave_cambiada() returns void
language sql security definer set search_path = public as
$$ update public.perfiles set debe_cambiar_clave = false where id = auth.uid() $$;
grant execute on function public.clave_cambiada() to authenticated;

-- ============================================================
-- Seguridad (RLS): quién ve y cambia qué
-- ============================================================
alter table public.perfiles enable row level security;
alter table public.proyectos enable row level security;
alter table public.tareas enable row level security;
alter table public.tickets enable row level security;
alter table public.puntaje_manual enable row level security;

-- Perfiles: todos los conectados los ven; solo Personas los edita
create policy perfiles_ver on public.perfiles for select to authenticated using (true);
create policy perfiles_editar on public.perfiles for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Proyectos y tareas: solo el equipo de marketing
create policy proyectos_mk on public.proyectos for all to authenticated using (public.es_marketing()) with check (public.es_marketing());
create policy tareas_mk on public.tareas for all to authenticated using (public.es_marketing()) with check (public.es_marketing());

-- Tickets: marketing ve todo; cada solicitante ve y edita solo los suyos
create policy tickets_ver on public.tickets for select to authenticated using (public.es_marketing() or solicitante = auth.uid());
create policy tickets_crear on public.tickets for insert to authenticated with check (solicitante = auth.uid() or public.es_marketing());
create policy tickets_editar on public.tickets for update to authenticated using (public.es_marketing() or solicitante = auth.uid()) with check (public.es_marketing() or solicitante = auth.uid());
create policy tickets_borrar on public.tickets for delete to authenticated using (public.es_marketing());

-- Puntaje manual: marketing lo ve; jefa/Personas lo edita
create policy puntaje_ver on public.puntaje_manual for select to authenticated using (public.es_marketing());
create policy puntaje_editar on public.puntaje_manual for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ============================================================
-- Archivos de los tickets (fotos y PDF)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('adjuntos', 'adjuntos', false, 10485760)
on conflict (id) do update set file_size_limit = 10485760;

drop policy if exists adjuntos_subir on storage.objects;
drop policy if exists adjuntos_ver on storage.objects;
create policy adjuntos_subir on storage.objects for insert to authenticated with check (bucket_id = 'adjuntos');
create policy adjuntos_ver on storage.objects for select to authenticated using (bucket_id = 'adjuntos');

-- ============================================================
-- Tiempo real: el panel se actualiza solo cuando otro cambia algo
-- ============================================================
alter publication supabase_realtime add table public.proyectos, public.tareas, public.tickets, public.perfiles;
