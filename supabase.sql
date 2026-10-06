-- Tabla de tareas
create table if not exists public.tareas (
  id bigint generated always as identity primary key,
  texto text not null check (char_length(texto) between 1 and 500),
  hecha boolean not null default false,
  created_at timestamptz not null default now()
);

-- Seguridad: RLS activado, pero abierto a cualquiera (solo para la prueba, sin login)
alter table public.tareas enable row level security;

create policy "leer todos"      on public.tareas for select to anon, authenticated using (true);
create policy "crear todos"     on public.tareas for insert to anon, authenticated with check (true);
create policy "editar todos"    on public.tareas for update to anon, authenticated using (true) with check (true);
create policy "borrar todos"    on public.tareas for delete to anon, authenticated using (true);

-- Necesario para que los borrados lleguen completos por Realtime
alter table public.tareas replica identity full;

-- Activar Realtime en esta tabla
alter publication supabase_realtime add table public.tareas;
