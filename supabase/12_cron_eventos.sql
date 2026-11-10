-- ============================================================
-- RABBIT AI | Envío diario de recordatorios de eventos (7 días, 1 día y el mismo día)
-- 1) Publica la función "avisar-evento" (Edge Functions > Deploy new function, Verify JWT apagado)
-- 2) Copia su URL y pégala abajo en lugar de PEGA_AQUI_LA_URL
-- 3) Pega la misma clave que usa el cumpleaños en lugar de PEGA_AQUI_LA_CLAVE
-- 4) Run. Se envía todos los días a las 8:00 a. m. de Lima (13:00 UTC)
-- ============================================================
select cron.unschedule('avisar-evento') where exists (select 1 from cron.job where jobname = 'avisar-evento');
select cron.schedule('avisar-evento', '0 13 * * *', $$
  select net.http_post(
    url := 'PEGA_AQUI_LA_URL',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"clave": "PEGA_AQUI_LA_CLAVE"}'::jsonb
  );
$$);
