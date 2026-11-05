-- 1) Fecha de cumpleaños (MM-DD) de cada persona
alter table public.perfiles add column if not exists cumple text;
update public.perfiles p set cumple = v.cumple from (values
  ('sofia', '01-30'),
  ('bellota', '03-10'),
  ('juan', '03-17'),
  ('mauricio', '03-17'),
  ('nicol', '03-23'),
  ('darwin', '04-07'),
  ('carlosdelcast', '05-11'),
  ('brenda', '05-14'),
  ('andres', '05-16'),
  ('aixa', '06-01'),
  ('hsalazar', '06-05'),
  ('mario', '06-20'),
  ('jose', '06-30'),
  ('lender', '07-04'),
  ('manuel', '07-09'),
  ('oscar', '07-23'),
  ('romano', '08-01'),
  ('alonso', '08-25'),
  ('luis', '09-07'),
  ('pierina', '10-24'),
  ('flormendez', '11-05'),
  ('kassandra', '11-15'),
  ('diego', '11-17'),
  ('antonio', '11-21'),
  ('gustavo', '12-05'),
  ('paola', '12-13'),
  ('susana', '12-13')
) as v(usuario, cumple) where p.usuario = v.usuario;

-- 2) Registro de comunicados enviados (evita mandar dos veces el mismo saludo)
create table if not exists public.comunicados_enviados (
  tipo text not null, perfil uuid not null references public.perfiles(id) on delete cascade, fecha date not null,
  primary key (tipo, perfil, fecha)
);
alter table public.comunicados_enviados enable row level security;

-- Revisa quién quedó con fecha
select nombre, apellido, usuario, cumple from public.perfiles order by cumple nulls last;
