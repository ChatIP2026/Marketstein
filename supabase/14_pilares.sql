-- RABBIT AI | Pilar de cada proyecto (1 a 4)
alter table public.proyectos add column if not exists pilar smallint check (pilar between 1 and 4);
