-- Recuerda si la persona ya vio el tutorial de bienvenida
alter table public.perfiles add column if not exists tutorial_visto boolean not null default false;

-- Cada persona puede marcar su propio tutorial como visto
create or replace function public.tutorial_visto() returns void
language sql security definer set search_path = public as $$
  update public.perfiles set tutorial_visto = true where id = auth.uid();
$$;
grant execute on function public.tutorial_visto() to authenticated;
