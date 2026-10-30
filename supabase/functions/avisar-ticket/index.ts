// Envía un correo a quien pidió el ticket cuando:
//  1) La jefa lo aprueba (se le asigna a alguien de marketing)
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
function plantilla(o: { listo: boolean; id: number; titulo: string; pieza: string; prioridad?: string; entrega?: string; entregado?: string; aTiempo?: boolean }) {
  const color = o.listo ? "#10b981" : "#0a0a0a";
  const pr = PRIO[o.prioridad || ""];
  const chip = (t: string, bg: string, c: string) => `<span style="display:inline-block;background:${bg};color:${c};font-size:12px;font-weight:700;padding:6px 11px;border-radius:999px;margin:0">${t}</span>`;
  const celda = (k: string, v: string, der = false) => `<td style="padding:12px 0 0;width:50%" align="${der ? "right" : "left"}"><div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa">${k}</div><div style="font-size:16px;font-weight:700;color:#0a0a0a;margin-top:3px">${v}</div></td>`;
  // Cada paso ocupa un tercio: media línea a cada lado del círculo, así las líneas se unen sin cortes
  const media = (h: boolean | null) => `<td style="padding:0"><div style="height:1.5px;line-height:1.5px;font-size:1px;background:${h === null ? "transparent" : h ? color : "#e4e4e7"}"></div></td>`;
  const nodo = (t: string, h: boolean, izq: boolean | null, der: boolean | null) => `<td width="33%" align="center" style="width:33%;padding:0">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>${media(izq)}${bola(h)}${media(der)}</tr></table>
      <div style="padding-top:6px;font-size:11px;color:${h ? "#0a0a0a" : "#a1a1aa"};font-weight:${h ? 700 : 400}">${t}</div></td>`;
  const bola = (h: boolean) => `<td align="center" width="26" style="width:26px"><div style="width:26px;height:26px;line-height:26px;border-radius:50%;background:${h ? color : "#e4e4e7"};color:#fff;font-size:14px;font-weight:700;text-align:center">${h ? "&#10003;" : ""}</div></td>`;
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
    <tr><td align="center" style="padding:30px 24px 4px">
      <div style="width:56px;height:56px;border-radius:50%;background:${color};margin:0 auto;text-align:center"><img src="${PANEL}/borradores/${o.listo ? "check" : "reloj"}-correo.png" width="28" height="28" alt="" style="display:inline-block;margin-top:14px"></div>
      <h1 style="margin:16px 0 0;font-size:22px;color:#0a0a0a">${o.listo ? "¡Tu ticket está listo!" : "¡Tu ticket fue aprobado!"}</h1>
    </td></tr>
    <tr><td style="padding:22px 24px 4px">
      <div style="border-top:2px dashed #e4e4e7;border-bottom:2px dashed #e4e4e7;padding:6px 0 8px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>${celda("Pedido", o.titulo)}${celda(o.listo ? "Entregado" : "Fecha", o.listo ? (o.entregado || "") : (o.entrega || ""), true)}</tr>
          <tr>${celda("Pieza", o.pieza || "—")}${celda("Prioridad", pr ? chip(pr[0], pr[2], pr[1]) : "—", true)}</tr>
        </table>
      </div>
    </td></tr>
    <tr><td style="padding:22px 24px 6px"><table width="100%" cellpadding="0" cellspacing="0">
      <tr>${nodo("Enviado", true, null, true)}${nodo("Aprobado", true, true, o.listo)}${nodo("Entregado", o.listo, o.listo, null)}</tr>
    </table></td></tr>
    <tr><td style="padding:18px 24px 26px"><a href="${PANEL}" style="display:block;background:#0a0a0a;color:#ffffff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">Ver mi ticket</a></td></tr>
  </table>
  <p style="font-size:11px;color:#a1a1aa;margin:16px 0 0">Correo automático de Rabbit | iPartner marketing</p>
</td></tr></table></body></html>`;
}

// Correo para el equipo de marketing: ticket nuevo o ticket asignado
function avisoEquipo(o: { id: number; titulo: string; tit: string; sub: string; quien: string; area: string; pieza: string; entrega: string; prioridad?: string }) {
  const pr = PRIO[o.prioridad || ""];
  // Datos en tarjetas: el pedido arriba a todo el ancho y el resto en dos columnas
  const caja = (k: string, v: string, ancho = 1) => `<td colspan="${ancho}" width="${ancho === 2 ? 100 : 50}%" style="padding:5px;vertical-align:top"><div style="background:#ffffff;border:1px solid #ececec;border-radius:12px;padding:12px 14px;height:46px"><div style="font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.08em">${k}</div><div style="margin-top:5px;font-size:15px;font-weight:700;color:#0a0a0a;line-height:1.35">${v}</div></div></td>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif"><tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e4e4e7">
    <tr><td style="background:#0a0a0a;padding:22px 24px"><table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="52"><div style="width:44px;height:44px;border-radius:12px;background:#ffffff;text-align:center"><img src="${LOGO}" width="36" height="36" alt="Rabbit" style="display:inline-block;margin-top:4px"></div></td>
      <td style="color:#ffffff;font-size:17px;font-weight:700;padding-left:10px">rabbit ai<div style="font-size:12px;font-weight:400;color:#a1a1aa;margin-top:2px">Equipo de marketing</div></td>
      <td align="right"><span style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px">${num(o.id)}</span></td>
    </tr></table></td></tr>
    <tr><td style="padding:28px 24px 4px"><h1 style="margin:0;font-size:21px;line-height:1.3;color:#0a0a0a">${o.tit}</h1><p style="margin:8px 0 0;font-size:14px;color:#71717a;line-height:1.45">${o.sub}</p></td></tr>
    <tr><td style="padding:18px 19px 4px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:16px;padding:5px">
      <tr>${caja("Pedido", o.titulo, 2)}</tr>
      <tr>${caja("Pedido por", `${o.quien} <span style="font-weight:400;color:#71717a">| ${o.area}</span>`)}${caja("Pieza", o.pieza || "—")}</tr>
      <tr>${caja("Entrega", o.entrega || "—")}${caja("Prioridad", pr ? `<span style="display:inline-block;background:${pr[2]};color:${pr[1]};font-size:12px;line-height:16px;padding:2px 10px;border-radius:999px">${pr[0]}</span>` : `<span style="font-weight:400;color:#71717a">Por definir</span>`)}</tr>
    </table></td></tr>
    <tr><td style="padding:22px 24px 26px"><a href="${PANEL}" style="display:block;background:#0a0a0a;color:#ffffff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">Abrir Rabbit</a></td></tr>
  </table>
  <p style="font-size:11px;color:#a1a1aa;margin:16px 0 0">Correo automático de Rabbit | iPartner marketing</p>
</td></tr></table></body></html>`;
}
const enviar = async (para: string, asunto: string, html: string) => {
  const r = await fetch(CORREO_URL, { method: "POST", body: JSON.stringify({ clave: CORREO_CLAVE, para, asunto, html }) });
  const txt = await r.text(); if (!txt.includes("ok")) console.error("No se envió el correo a", para, txt); return txt;
};
const perfil = async (id: string) => (await sb.from("perfiles").select("nombre, area, correo").eq("id", id).single()).data;

Deno.serve(async (req) => {
  const { type, record: t, old_record: o } = await req.json();
  if (!t) return new Response("sin datos");
  const pieza = esc([t.tipo, t.formato].filter(Boolean).join(" | "));

  // 1) Ticket nuevo: aviso a todo el equipo de marketing
  if (type === "INSERT" || !o) {
    const sol = await perfil(t.solicitante);
    const { data: eq } = await sb.from("perfiles").select("correo").in("rol", ["jefa", "equipo"]).eq("activa", true);
    for (const p of eq || []) await enviar(p.correo, `Nuevo ticket ${num(t.id)} de ${sol?.nombre || "alguien"}`, avisoEquipo({ id: t.id, titulo: esc(t.titulo),
      tit: `${esc(sol?.nombre || "Alguien")} envió un ticket`, sub: "Está esperando la revisión del equipo de marketing.", quien: esc(sol?.nombre || "—"), area: esc(sol?.area || ""), pieza, entrega: fecha(t.fecha) }));
    return new Response("aviso de ticket nuevo enviado");
  }

  const aprobado = !o.asignado && t.asignado && !["rechazado", "cancelado"].includes(t.estado);
  const reasignado = o.asignado && t.asignado && o.asignado !== t.asignado;
  const entregado = o.estado !== "entregado" && t.estado === "entregado";

  // 2) Ticket asignado (o reasignado): aviso a la persona encargada
  if (aprobado || reasignado) {
    const [enc, sol, jefa] = await Promise.all([perfil(t.asignado), perfil(t.solicitante), sb.from("perfiles").select("nombre").eq("rol", "jefa").limit(1).single().then((r) => r.data)]);
    if (enc?.correo) await enviar(enc.correo, `Te asignaron el ticket de ${sol?.nombre || "alguien"}`, avisoEquipo({ id: t.id, titulo: esc(t.titulo),
      tit: `Te asignaron el ticket de ${esc(sol?.nombre || "alguien")}`, sub: `${esc(jefa?.nombre || "La Team Líder")} te lo asignó. Ya aparece en tu Mi entorno.`, quien: esc(sol?.nombre || "—"), area: esc(sol?.area || ""), pieza, entrega: fecha(t.fecha), prioridad: t.prioridad }));
  }
  if (!aprobado && !entregado) return new Response("listo");

  const { data: u } = await sb.auth.admin.getUserById(t.solicitante);
  const para = u?.user?.email;
  if (!para) return new Response("sin correo");

  const asunto = aprobado ? `Tu ticket ${num(t.id)} fue aprobado` : `Tu ticket ${num(t.id)} está listo`;
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const html = plantilla({ listo: !aprobado, id: t.id, titulo: esc(t.titulo), pieza,
    prioridad: t.prioridad, entrega: fecha(t.fecha), entregado: aprobado ? undefined : fecha(hoy), aTiempo: hoy <= t.fecha });

  const r = await fetch(CORREO_URL, { method: "POST", body: JSON.stringify({ clave: CORREO_CLAVE, para, asunto, html }) });
  const txt = await r.text();
  if (!txt.includes("ok")) console.error("No se envió el correo:", txt);
  return new Response(txt);
});
