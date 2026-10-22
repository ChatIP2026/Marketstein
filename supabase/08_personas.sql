-- Registra al personal de otras áreas (rol "solicitante": entran con "Crear un ticket", sin contraseña)
-- Si el correo o el usuario ya existe, esa persona se salta (se puede correr dos veces sin duplicar)
do $$
declare
  r record; nuevo uuid; creados int := 0; saltados text := '';
begin
  for r in select * from (values
    ('Manuel', 'Jimenez Eguia', 'manuel', 'gerencia.legal@socioip.com', 'Gerencia', 'Gerente Legal'),
    ('Mario', 'Mendez Castro', 'mario', 'mm@socioip.com', 'Gerencia', 'CEO'),
    ('Aixa', 'Enriquez Silva', 'aixa', 'ae.comercial@socioip.com', 'Ventas', 'Strategic Account Manager'),
    ('Sofia', 'Salcedo Yovera', 'sofia', 'ss.comercial@socioip.com', 'Ventas', 'Gestor Comercial'),
    ('Gustavo', 'Aspajo Rengifo', 'gustavoa', 'headlegal@seleccionfb.com', 'Legal', 'Head of Legal, Adm & Finance'),
    ('Brenda', 'Sanchez Sante', 'brenda', 'cobranzas@socioip.com', 'Finanzas', 'Asistente de Cobranzas'),
    ('Dalia', 'De La Cruz Vega', 'dalia', 'fidelizacion.nd@seleccionfb.com', 'Postventa', 'Head of Customer Success'),
    ('Darwin', 'Hoyos Ayala', 'darwin', 'dh.comercial@seleccionfb.com', 'Postventa', 'Ejecutivo de Cuentas'),
    ('José', 'Salazar Ayala', 'jose', 'js.comercial@seleccionfb.com', 'Postventa', 'Sectorista Comercial'),
    ('Romano', 'Alfaro Carmona', 'romano', 'ra.comercial@seleccionfb.com', 'Postventa', 'Gold Key Account Manager'),
    ('Gustavo', 'Inga Molina', 'gustavoi', 'comunicaciones@socioip.com', 'Postventa', 'UX'),
    ('Oscar', 'Montes Benites', 'oscar', 'finanzas@socioip.com', 'Finanzas', 'Jefe de Finanzas'),
    ('Lender', 'Sayago Patiño', 'lender', 'facturacion@socioip.com', 'Finanzas', 'Analista de Facturación'),
    ('Susana', 'Mora Pariona', 'susana', 'srmp79@hotmail.com', 'Finanzas', 'Auxiliar de Limpieza'),
    ('Paola', 'Quevedo Esteban', 'paola', 'sistemas@seleccionfb.com', 'Procesos', 'Jefe de TI'),
    ('Kassandra', 'Lopez Wong', 'kassandra', 'apoyo.informes33@gmail.com', 'Procesos', 'Auxiliar de Procesos'),
    ('Andres', 'Castillo Santa Cruz', 'andres', 'andrescsc1916@gmail.com', 'Ventas', 'Auxiliar de Procesos'),
    ('Juan', 'Ruiz Huayta', 'juan', 'mauruizhu@outlook.com', 'Procesos', 'Analista de Sistemas'),
    ('Luis', 'Cabanillas Vargas', 'luis', 'legal@seleccionfb.com', 'Legal', 'Analista Legal'),
    ('Diego', 'Enriquez Silva', 'diego', 'apoyo.informes38@gmail.com', 'Procesos', 'Auxiliar de Procesos'),
    ('Antonio', 'Villar Olguin', 'antonio', 'antooonio.villaaar@gmail.com', 'Legal', 'Practicante Legal'),
    ('Tirza', 'Ruiz Baca', 'tirza', 'tirzaisabellaruizbaca@gmail.com', 'Procesos', 'Auxiliar de Procesos')
  ) as v(nombre, apellido, usuario, correo, area, cargo)
  loop
    if exists (select 1 from auth.users where email = lower(r.correo))
       or exists (select 1 from public.perfiles where usuario = lower(r.usuario)) then
      saltados := saltados || r.usuario || ' ';
      continue;
    end if;
    nuevo := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', nuevo, 'authenticated', 'authenticated', lower(r.correo),
      extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('nombre', r.nombre), now(), now(), '', '', '', '');
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), nuevo::text, nuevo, jsonb_build_object('sub', nuevo::text, 'email', lower(r.correo)),
      'email', now(), now(), now());
    insert into public.perfiles (id, nombre, apellido, usuario, correo, area, rol, cargo)
    values (nuevo, r.nombre, r.apellido, lower(r.usuario), lower(r.correo), r.area, 'solicitante', r.cargo);
    creados := creados + 1;
  end loop;
  raise notice 'Creados: % | Saltados: %', creados, coalesce(nullif(saltados, ''), 'ninguno');
end $$;

-- Revisa el resultado
select nombre, apellido, usuario, area, cargo, rol from public.perfiles order by area, nombre;
