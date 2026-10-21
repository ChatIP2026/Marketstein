// Acceso rápido para quienes solo dejan tickets (rol "solicitante"):
//  - { accion: "lista" }  → nombres de las personas que pueden entrar así
//  - { accion: "entrar", id } → token de un solo uso para abrir su sesión sin contraseña
// Marketing (jefa / equipo) nunca puede entrar por aquí.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const resp = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const { accion, id } = await req.json().catch(() => ({}));
  if (accion === "lista") {
    const { data, error } = await sb.from("perfiles").select("id, nombre, apellido, area").eq("rol", "solicitante").eq("activa", true).order("nombre");
    return error ? resp({ error: error.message }, 500) : resp({ personas: data });
  }
  if (accion === "entrar" && id) {
    const { data: p } = await sb.from("perfiles").select("correo, rol, activa").eq("id", id).single();
    if (!p || p.rol !== "solicitante" || !p.activa) return resp({ error: "No disponible" }, 403);
    const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email: p.correo });
    if (error) return resp({ error: error.message }, 500);
    return resp({ token: data.properties.hashed_token });
  }
  return resp({ error: "Acción no válida" }, 400);
});
