-- ============================================================
-- RABBIT AI | Tareas de proyectos con varios responsables y fecha límite
-- Pegar en Supabase > SQL Editor > New query > Run (se puede correr dos veces)
-- ============================================================
alter table public.tareas add column if not exists encargados uuid[] not null default '{}';
alter table public.tareas add column if not exists fecha date;
-- Las tareas que ya tenían un responsable lo pasan a la lista nueva
update public.tareas set encargados = array[encargado] where encargado is not null and encargados = '{}';
