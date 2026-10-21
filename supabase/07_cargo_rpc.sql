create or replace function public.poner_cargo(p_id uuid, p_cargo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfiles where id = auth.uid() and (admin_personas or rol = 'jefa')) then
    raise exception 'Sin permiso';
  end if;
  update perfiles set cargo = nullif(trim(p_cargo), '') where id = p_id;
end $$;
grant execute on function public.poner_cargo(uuid, text) to authenticated;
