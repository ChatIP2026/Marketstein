// Envía el correo de cumpleaños SOLO a quien cumple años hoy (hora de Lima).
// Lo llama una tarea diaria (pg_cron). Cada persona recibe un solo correo por año, aunque se llame varias veces.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORREO_URL = Deno.env.get("CORREO_URL")!;
const CORREO_CLAVE = Deno.env.get("CORREO_CLAVE")!;
const PANEL = "https://rabbit-ipartner.vercel.app";
const LOGO = `${PANEL}/borradores/rabbit-correo.png`;
const esc = (x: string) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

function correo(nombre: string, usuario: string, fecha: string) {
  const [, m, d] = fecha.split("-");
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e4e4e7">
 <tr><td style="background:#0a0a0a;padding:22px 24px"><table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td width="52"><div style="width:44px;height:44px;border-radius:12px;background:#ffffff;text-align:center"><img src="${LOGO}" width="36" height="36" alt="Rabbit" style="display:inline-block;margin-top:4px"></div></td>
  <td style="color:#ffffff;font-size:17px;font-weight:700;padding-left:10px">rabbit ai<div style="font-size:12px;font-weight:400;color:#a1a1aa;margin-top:2px">Comunicados | iPartner</div></td>
  <td align="right"><span style="display:inline-block;background:#ffd45c;color:#0a0a0a;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px">${+d} ${MES[+m - 1]}</span></td></tr></table></td></tr>
 <tr><td align="center" style="padding:0;background:#fff7e6"><img src="${PANEL}/borradores/cumple/${encodeURIComponent(usuario)}.png" width="460" alt="" style="display:block;width:100%;max-width:460px;height:auto"></td></tr>
 <tr><td align="center" style="padding:10px 24px 6px;background:#fffbf3">
  <div style="font-size:13px;font-weight:700;letter-spacing:.14em;color:#d97706;text-transform:uppercase">Hoy es tu día</div>
  <h1 style="margin:8px 0 0;font-size:30px;line-height:1.15;color:#0a0a0a">¡Feliz cumpleaños,<br>${esc(nombre)}!</h1>
 </td></tr>
 <tr><td style="padding:18px 30px 34px;text-align:center;font-size:15px;line-height:1.6;color:#52525b">
  Todo el equipo de iPartner te desea un día lleno de alegría. Gracias por todo lo que aportas cada día. ¡Que este nuevo año venga con muchos logros!
 </td></tr>
</table>
<p style="font-size:11px;color:#a1a1aa;margin:16px 0 0">Correo automático de Rabbit | iPartner</p>
</td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const { clave } = await req.json().catch(() => ({}));
  if (clave !== CORREO_CLAVE) return new Response("no autorizado", { status: 401 });
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }); // AAAA-MM-DD
  const { data: gente, error } = await sb.from("perfiles").select("id, nombre, usuario, correo").eq("cumple", hoy.slice(5)).eq("activa", true);
  if (error) return new Response(error.message, { status: 500 });
  const enviados: string[] = [];
  for (const p of gente || []) {
    // un solo saludo por persona y por año
    const { error: dup } = await sb.from("comunicados_enviados").insert({ tipo: "cumple", perfil: p.id, fecha: hoy });
    if (dup) continue;
    const r = await fetch(CORREO_URL, { method: "POST", body: JSON.stringify({ clave: CORREO_CLAVE, para: p.correo, asunto: `¡Feliz cumpleaños, ${p.nombre}!`, html: correo(p.nombre, p.usuario, hoy) }) });
    const txt = await r.text();
    if (!txt.includes("ok")) { console.error("No se envió a", p.correo, txt); await sb.from("comunicados_enviados").delete().match({ tipo: "cumple", perfil: p.id, fecha: hoy }); continue; }
    enviados.push(p.nombre);
  }
  return new Response(JSON.stringify({ hoy, enviados }), { headers: { "Content-Type": "application/json" } });
});
