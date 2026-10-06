-- ============================================================
-- Proyectos con tareas dentro (versión 2)
-- Ejecutar completo en Supabase > SQL Editor > Run
-- OJO: borra la tabla "tareas" de la versión 1 (estaba vacía de prueba)
-- ============================================================

drop table if exists public.tareas;
drop table if exists public.proyectos;

create table public.proyectos (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 200),
  estado text not null default 'sin_empezar' check (estado in ('sin_empezar', 'en_curso', 'listo')),
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  encargados text[] not null default '{}',
  fecha_limite date,
  created_at timestamptz not null default now()
);

create table public.tareas (
  id bigint generated always as identity primary key,
  proyecto_id bigint not null references public.proyectos(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  hecha boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.tareas (proyecto_id);

-- Seguridad: RLS activado pero abierto a cualquiera (solo para la prueba, sin login)
alter table public.proyectos enable row level security;
alter table public.tareas    enable row level security;

create policy "todo abierto" on public.proyectos for all to anon, authenticated using (true) with check (true);
create policy "todo abierto" on public.tareas    for all to anon, authenticated using (true) with check (true);

-- Realtime
alter table public.proyectos replica identity full;
alter table public.tareas    replica identity full;
alter publication supabase_realtime add table public.proyectos;
alter publication supabase_realtime add table public.tareas;
