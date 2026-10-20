// Envía un correo a quien pidió el ticket cuando:
//  1) Hilary lo aprueba (se le asigna a alguien de marketing)
//  2) Marketing lo marca como Entregado
// Se dispara desde un Database Webhook de Supabase sobre la tabla tickets (UPDATE).
// El correo sale desde una cuenta de Gmail a través de Google Apps Script (por HTTPS):
// las funciones de Supabase no pueden usar los puertos de correo (SMTP), pero sí HTTPS.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORREO_URL = Deno.env.get("CORREO_URL")!; // URL de la app web de Apps Script
const CORREO_CLAVE = Deno.env.get("CORREO_CLAVE")!; // misma clave que en el Apps Script
const PANEL = "https://rabbit-ipartner.vercel.app";
const esc = (x: string) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const num = (id: number) => "#" + String(id).padStart(3, "0");
const fecha = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-PE", { day: "numeric", month: "long" });

function plantilla(titulo: string, intro: string, filas: [string, string][]) {
  return `<div style="font-family:Arial,sans-serif;background:#f4f4f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
    <div style="background:#0a0a0a;color:#fff;padding:18px 22px;font-size:18px;font-weight:700">rabbit ai</div>
    <div style="padding:22px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#0a0a0a">${titulo}</h2>
      <p style="margin:0 0 16px;color:#52525b;font-size:14px">${intro}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${filas.map(([k, v]) =>
        `<tr><td style="padding:8px 0;color:#71717a;border-top:1px solid #eee">${k}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0a0a0a;border-top:1px solid #eee">${v}</td></tr>`).join("")}</table>
      <a href="${PANEL}" style="display:block;margin-top:20px;background:#0a0a0a;color:#fff;text-align:center;padding:12px;border-radius:10px;text-decoration:none;font-weight:700">Ver mi ticket</a>
    </div>
  </div></div>`;
}

Deno.serve(async (req) => {
  const { record: t, old_record: o } = await req.json();
  if (!t || !o) return new Response("sin datos");
  const aprobado = !o.asignado && t.asignado && !["rechazado", "cancelado"].includes(t.estado);
  const entregado = o.estado !== "entregado" && t.estado === "entregado";
  if (!aprobado && !entregado) return new Response("nada que avisar");

  const { data: u } = await sb.auth.admin.getUserById(t.solicitante);
  const para = u?.user?.email;
  if (!para) return new Response("sin correo");
  const { data: quien } = t.asignado ? await sb.from("perfiles").select("nombre").eq("id", t.asignado).single() : { data: null };
  const encargado = quien?.nombre || "marketing";

  const asunto = aprobado ? `Tu ticket ${num(t.id)} fue aprobado` : `Tu ticket ${num(t.id)} está listo`;
  const html = aprobado
    ? plantilla("¡Tu ticket fue aprobado!", esc(t.titulo), [["Ticket", num(t.id)], ["Lo hará", esc(encargado)], ["Prioridad", t.prioridad || "—"], ["Entrega", fecha(t.fecha)]])
    : plantilla("¡Tu ticket está listo!", esc(t.titulo), [["Ticket", num(t.id)], ["Lo hizo", esc(encargado)]]);

  const r = await fetch(CORREO_URL, { method: "POST", body: JSON.stringify({ clave: CORREO_CLAVE, para, asunto, html }) });
  const txt = await r.text();
  if (!txt.includes("ok")) console.error("No se envió el correo:", txt);
  return new Response(txt);
});
