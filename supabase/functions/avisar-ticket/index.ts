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

const PRIO: Record<string, [string, string, string]> = {
  urgente: ["Urgente", "#ffffff", "#dc2626"], alta: ["Alta", "#b91c1c", "#fee2e2"],
  media: ["Media", "#92400e", "#fef3c7"], baja: ["Baja", "#1d4ed8", "#dbeafe"],
};
const LOGO = `${PANEL}/borradores/rabbit-correo.png`;

// Correo con forma de ticket: cabecera negra con Rabbit, estado, datos y avance (Enviado > Aprobado > Entregado)
function plantilla(o: { listo: boolean; id: number; titulo: string; persona: string; pieza: string; prioridad?: string; entrega?: string; entregado?: string; aTiempo?: boolean }) {
  const color = o.listo ? "#10b981" : "#0a0a0a";
  const pr = PRIO[o.prioridad || ""];
  const fila = (k: string, v: string) => `<tr><td style="padding:10px 0;color:#71717a;font-size:13px;border-top:1px dashed #e4e4e7">${k}</td><td align="right" style="padding:10px 0;font-size:14px;font-weight:700;color:#0a0a0a;border-top:1px dashed #e4e4e7">${v}</td></tr>`;
  const paso = (t: string, hecho: boolean) => `<td align="center" style="width:33%;font-size:11px;color:${hecho ? "#0a0a0a" : "#a1a1aa"};font-weight:${hecho ? 700 : 400}">
      <div style="width:26px;height:26px;line-height:26px;border-radius:50%;margin:0 auto 6px;background:${hecho ? color : "#e4e4e7"};color:#fff;font-size:14px;font-weight:700">${hecho ? "&#10003;" : ""}</div>${t}</td>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif"><tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e4e4e7">
    <tr><td style="background:#0a0a0a;padding:22px 24px">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="52"><div style="width:44px;height:44px;border-radius:12px;background:#ffffff;text-align:center"><img src="${LOGO}" width="36" height="36" alt="Rabbit" style="display:inline-block;margin-top:4px"></div></td>
        <td style="color:#ffffff;font-size:17px;font-weight:700;padding-left:10px">rabbit ai<div style="font-size:12px;font-weight:400;color:#a1a1aa;margin-top:2px">Tickets de marketing</div></td>
        <td align="right"><span style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px">${num(o.id)}</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:26px 24px 6px">
      <span style="display:inline-block;background:${o.listo ? "#d1fae5" : "#f4f4f5"};color:${o.listo ? "#047857" : "#0a0a0a"};font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px">${o.listo ? "&#10003; Entregado" : "&#10003; Aprobado"}</span>
      <h1 style="margin:14px 0 6px;font-size:22px;line-height:1.25;color:#0a0a0a">${o.listo ? "¡Tu ticket está listo!" : "¡Tu ticket fue aprobado!"}</h1>
      <p style="margin:0;font-size:14px;color:#52525b;line-height:1.5">${o.listo ? `${o.persona} terminó tu pedido. Ya puedes revisarlo en Rabbit.` : `${o.persona} ya está trabajando en tu pedido.`}</p>
    </td></tr>
    <tr><td style="padding:18px 24px 4px">
      <div style="background:#fafafa;border:1px solid #f0f0f2;border-radius:14px;padding:4px 16px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td colspan="2" style="padding:12px 0 10px;font-size:16px;font-weight:700;color:#0a0a0a">${o.titulo}</td></tr>
          ${fila(o.listo ? "Lo hizo" : "Lo hará", o.persona)}
          ${fila("Pieza", o.pieza)}
          ${pr ? fila("Prioridad", `<span style="background:${pr[2]};color:${pr[1]};padding:3px 9px;border-radius:999px;font-size:12px">${pr[0]}</span>`) : ""}
          ${o.entrega ? fila(o.listo ? "Fecha pedida" : "Entrega", o.entrega) : ""}
          ${o.entregado ? fila("Entregado", `${o.entregado} <span style="background:${o.aTiempo ? "#d1fae5" : "#fee2e2"};color:${o.aTiempo ? "#047857" : "#b91c1c"};padding:3px 9px;border-radius:999px;font-size:12px;margin-left:4px">${o.aTiempo ? "A tiempo" : "Con retraso"}</span>`) : ""}
        </table>
      </div>
    </td></tr>
    <tr><td style="padding:22px 24px 6px"><table width="100%" cellpadding="0" cellspacing="0"><tr>${paso("Enviado", true)}${paso("Aprobado", true)}${paso("Entregado", o.listo)}</tr></table></td></tr>
    <tr><td style="padding:18px 24px 26px"><a href="${PANEL}" style="display:block;background:#0a0a0a;color:#ffffff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">Ver mi ticket</a></td></tr>
  </table>
  <p style="font-size:11px;color:#a1a1aa;margin:16px 0 0">Correo automático de Rabbit | iPartner marketing</p>
</td></tr></table></body></html>`;
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
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const html = plantilla({ listo: !aprobado, id: t.id, titulo: esc(t.titulo), persona: esc(encargado), pieza: esc([t.tipo, t.formato].filter(Boolean).join(" | ")),
    prioridad: t.prioridad, entrega: fecha(t.fecha), entregado: aprobado ? undefined : fecha(hoy), aTiempo: hoy <= t.fecha });

  const r = await fetch(CORREO_URL, { method: "POST", body: JSON.stringify({ clave: CORREO_CLAVE, para, asunto, html }) });
  const txt = await r.text();
  if (!txt.includes("ok")) console.error("No se envió el correo:", txt);
  return new Response(txt);
});
