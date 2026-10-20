-- Proyectos: guarda si están en Standby
alter table public.proyectos add column if not exists standby boolean not null default false;
