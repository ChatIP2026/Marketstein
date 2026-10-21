-- Cargo visible de cada persona (Ej.: Directora Creativa Jr.)
alter table public.perfiles add column if not exists cargo text;
