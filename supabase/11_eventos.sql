-- ============================================================
-- RABBIT AI | Eventos de la empresa (Marketing + Legal)
-- Pegar en Supabase > SQL Editor > New query > Run
-- Se puede correr dos veces: no duplica nada
-- ============================================================

-- Quién trabaja en eventos: todo Marketing y las personas del área Legal
create or replace function public.es_eventos() returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_marketing() or exists (
    select 1 from public.perfiles where id = auth.uid() and area = 'Legal' and activa
  );
$$;

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 200),
  tipo text not null default 'interno' check (tipo in ('interno', 'externo')),
  prep_desde date,
  prep_hasta date,
  fecha_desde date,                 -- vacío = fecha por definir
  fecha_hasta date,
  hora text not null default '',
  lugar text not null default '',
  por_confirmar boolean not null default false,
  encargados uuid[] not null default '{}',
  creado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.evento_tareas (
  id bigint generated always as identity primary key,
  evento_id bigint not null references public.eventos(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  encargados uuid[] not null default '{}',
  fecha date,
  hecha boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists evento_tareas_evento on public.evento_tareas (evento_id);

alter table public.eventos enable row level security;
alter table public.evento_tareas enable row level security;

drop policy if exists eventos_ver on public.eventos;
drop policy if exists eventos_crear on public.eventos;
drop policy if exists eventos_editar on public.eventos;
drop policy if exists eventos_borrar on public.eventos;
drop policy if exists ev_tareas_todo on public.evento_tareas;

-- Marketing y Legal ven, crean y editan cualquier evento
create policy eventos_ver on public.eventos for select to authenticated using (public.es_eventos());
create policy eventos_crear on public.eventos for insert to authenticated with check (public.es_eventos());
create policy eventos_editar on public.eventos for update to authenticated using (public.es_eventos()) with check (public.es_eventos());
-- Solo quien lo creó o la Team Líder lo borra
create policy eventos_borrar on public.eventos for delete to authenticated using (creado_por = auth.uid() or public.es_admin());
create policy ev_tareas_todo on public.evento_tareas for all to authenticated using (public.es_eventos()) with check (public.es_eventos());

do $$ begin
  alter publication supabase_realtime add table public.eventos, public.evento_tareas;
exception when duplicate_object then null; end $$;

-- ---------- Calendario corporativo (del Excel). Fechas tentativas: "Por confirmar" ----------
-- Preparación por defecto: las 2 semanas anteriores al evento
insert into public.eventos (nombre, tipo, prep_desde, prep_hasta, fecha_desde, fecha_hasta, lugar, por_confirmar)
select v.nombre, v.tipo, v.f::date - 14, v.f::date - 1, v.f::date, v.f::date, v.lugar, v.pc
from (values
  ('Acción de gracias', 'interno', '2026-11-26', 'Oficina principal', false),
  ('Desayuno ejecutivo | 2 sectores', 'externo', '2026-11-27', '', true),
  ('Evento de Fin de Año', 'interno', '2026-12-18', '', true),
  ('Preventa fiesta | online', 'externo', '2027-01-29', 'Online', true),
  ('Preventa', 'interno', '2027-01-29', '', true),
  ('Por elegir: Paseo en yate | Padlet | Club con piscina', 'interno', '2027-02-26', '', true),
  ('Por elegir: Buffet | Escape room | Paintball', 'interno', '2027-03-26', '', true),
  ('IP-Tonazo', 'interno', '2027-04-30', '', true),
  ('IP-Tonazo | Día del Padre / 1 de mayo', 'externo', '2027-04-30', '', true),
  ('Aniversario #16 iPartner', 'interno', '2027-05-28', '', true),
  ('Cumpleaños MM', 'interno', '2027-06-25', '', true),
  ('Desayuno ejecutivo | 2 sectores', 'externo', '2027-06-25', '', true),
  ('Por elegir: Danza | La Candelaria | Peña criolla (reservar con 2 meses)', 'interno', '2027-07-23', '', true),
  ('Workshop', 'interno', '2027-08-27', '', true),
  ('Workshop', 'externo', '2027-08-27', '', true),
  ('Gynkana deportiva', 'interno', '2027-09-24', '', true),
  ('Fiesta de Halloween y disfraces', 'interno', '2027-10-29', '', true),
  ('Acción de gracias', 'interno', '2027-11-25', 'Oficina principal', true),
  ('Desayuno ejecutivo | 2 sectores', 'externo', '2027-11-26', '', true)
) as v(nombre, tipo, f, lugar, pc)
where not exists (select 1 from public.eventos e where e.nombre = v.nombre and e.tipo = v.tipo and e.fecha_desde = v.f::date);
