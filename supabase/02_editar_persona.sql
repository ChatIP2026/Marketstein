-- Editar una persona (solo quienes administran Personas). Cambia también el correo de acceso.
create or replace function public.editar_persona(
  p_id uuid, p_apellido text, p_usuario text, p_correo text, p_area text, p_rol text, p_admin boolean, p_carpeta text
) returns void
language plpgsql security definer set search_path = public, auth as
$$
begin
  if not public.es_admin() then raise exception 'No tienes permiso'; end if;
  if exists (select 1 from public.perfiles where usuario = lower(p_usuario) and id <> p_id) then raise exception 'El usuario ya está en uso'; end if;
  if exists (select 1 from auth.users where email = lower(p_correo) and id <> p_id) then raise exception 'Ya existe una cuenta con ese correo'; end if;
  update auth.users set email = lower(p_correo), updated_at = now() where id = p_id;
  update auth.identities set identity_data = identity_data || jsonb_build_object('email', lower(p_correo)) where user_id = p_id and provider = 'email';
  update public.perfiles set apellido = coalesce(p_apellido, ''), usuario = lower(p_usuario), correo = lower(p_correo),
    area = p_area, rol = p_rol, admin_personas = coalesce(p_admin, false), carpeta = p_carpeta where id = p_id;
end $$;
grant execute on function public.editar_persona(uuid, text, text, text, text, text, boolean, text) to authenticated;

-- Activar o desactivar una cuenta (solo Personas; nadie puede desactivarse a sí mismo)
create or replace function public.activar_persona(p_id uuid, p_activa boolean) returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not public.es_admin() then raise exception 'No tienes permiso'; end if;
  if p_id = auth.uid() then raise exception 'No puedes desactivar tu propia cuenta'; end if;
  update public.perfiles set activa = p_activa where id = p_id;
end $$;
grant execute on function public.activar_persona(uuid, boolean) to authenticated;

-- Cerrar la puerta de la cuenta inicial: desde ahora solo Personas crea cuentas
revoke execute on function public.crear_persona(text, text, text, text, text, text, text, boolean, text) from anon;
