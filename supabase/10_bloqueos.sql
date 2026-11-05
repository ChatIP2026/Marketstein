-- Rangos de fechas en los que no se aceptan entregas de tickets (los define la Team Líder)
create table if not exists public.bloqueos_entrega (
  id bigint generated always as identity primary key,
  desde date not null,
  hasta date not null,
  motivo text not null default '',
  creado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (hasta >= desde)
);
alter table public.bloqueos_entrega enable row level security;
-- Todos los conectados los ven (quien pide un ticket necesita saber qué días no puede elegir)
create policy bloqueos_ver on public.bloqueos_entrega for select to authenticated using (true);
-- Solo la Team Líder los crea y los quita
create policy bloqueos_editar on public.bloqueos_entrega for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
alter publication supabase_realtime add table public.bloqueos_entrega;
