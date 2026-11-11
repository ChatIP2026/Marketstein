// Recordatorio de eventos: 7 días antes, 1 día antes y el mismo día (hora de Lima).
// Le llega a cada encargado del evento (si no tiene encargados, a la Team Líder), con sus tareas pendientes.
// Lo llama una tarea diaria (pg_cron). Cada aviso se manda una sola vez por persona.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORREO_URL = Deno.env.get("CORREO_URL")!;
const CORREO_CLAVE = Deno.env.get("CORREO_CLAVE")!;
const PANEL = "https://rabbit-ipartner.vercel.app";
const LOGO = `${PANEL}/borradores/rabbit-correo.png`;
const esc = (x: string) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
const DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const TIPO: Record<string, { t: string; c: string; f: string; tx: string }> = {
  interno: { t: "Interno", c: "#E07B1A", f: "#FFE7CC", tx: "#B4580A" },
  externo: { t: "Externo", c: "#7C4DDB", f: "#ECE3FF", tx: "#5B34B5" },
};
const suma = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const larga = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); return `${DIA[d.getUTCDay()]} ${d.getUTCDate()} de ${MES[d.getUTCMonth()]}`; };
const corta = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); return `${d.getUTCDate()} ${MES[d.getUTCMonth()].slice(0, 3)}`; };

const AVISOS = [
  { dias: 7, clave: "ev7", titulo: "Falta una semana", asunto: (n: string) => `Falta una semana para ${n}` },
  { dias: 1, clave: "ev1", titulo: "Es mañana", asunto: (n: string) => `Mañana es ${n}` },
  { dias: 0, clave: "ev0", titulo: "Es hoy", asunto: (n: string) => `Hoy es ${n}` },
];

type Ev = { id: number; nombre: string; tipo: string; fecha_desde: string; fecha_hasta: string | null; hora: string; lugar: string; por_confirmar: boolean; prep_desde: string | null; prep_hasta: string | null; encargados: string[] };

function correo(e: Ev, aviso: typeof AVISOS[number], nombre: string, tareas: { texto: string; fecha: string | null }[]) {
  const T = TIPO[e.tipo] || TIPO.interno;
  const fin = e.fecha_hasta && e.fecha_hasta !== e.fecha_desde ? e.fecha_hasta : null;
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.nombre)}&dates=${e.fecha_desde.replace(/-/g, "")}/${suma(fin || e.fecha_desde, 1).replace(/-/g, "")}&location=${encodeURIComponent(e.lugar || "")}&details=${encodeURIComponent("Evento de iPartner" + (e.hora ? " | " + e.hora : ""))}`;
  const caja = (tit: string, val: string, col = 1) => `<td ${col > 1 ? `colspan="${col}"` : `width="50%"`} valign="top" style="padding:5px"><div style="background:#f6f6f6;border-radius:12px;padding:11px 13px;min-height:46px"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#888;text-transform:uppercase">${tit}</div><div style="font-size:14px;font-weight:700;color:#0a0a0a;margin-top:4px">${val}</div></div></td>`;
  const lista = tareas.length
    ? `<div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:#888;text-transform:uppercase;margin:4px 0 8px">Tus tareas pendientes</div>` +
      tareas.map((t) => `<div style="border:1px solid #eee;border-radius:10px;padding:9px 12px;margin-bottom:6px;font-size:14px;color:#222">${esc(t.texto)}${t.fecha ? `<span style="float:right;color:#888;font-size:12px">${corta(t.fecha)}</span>` : ""}</div>`).join("")
    : `<div style="background:#f0fdf6;border-radius:10px;padding:10px 12px;font-size:14px;color:#166534">No tienes tareas pendientes en este evento.</div>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e4e4e7">
 <tr><td style="background:#0a0a0a;padding:22px 24px"><table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td width="52"><div style="width:44px;height:44px;border-radius:12px;background:#ffffff;text-align:center"><img src="${LOGO}" width="36" height="36" alt="Rabbit" style="display:inline-block;margin-top:4px"></div></td>
  <td style="color:#ffffff;font-size:17px;font-weight:700;padding-left:10px">rabbit ai<div style="font-size:12px;font-weight:400;color:#a1a1aa;margin-top:2px">Eventos | iPartner</div></td>
  <td align="right"><span style="display:inline-block;background:${T.c};color:#ffffff;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px">${aviso.titulo}</span></td></tr></table></td></tr>
 <tr><td style="padding:24px 24px 6px">
  <span style="display:inline-block;background:${T.f};color:${T.tx};font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px">${T.t}</span>${e.por_confirmar ? ` <span style="display:inline-block;background:#f1f1f1;color:#666;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px">Por confirmar</span>` : ""}
  <h1 style="margin:12px 0 4px;font-size:24px;line-height:1.2;color:#0a0a0a">${esc(e.nombre)}</h1>
  <p style="margin:0;font-size:15px;line-height:1.5;color:#52525b">Hola ${esc(nombre)}, ${aviso.dias === 0 ? "hoy es el evento" : aviso.dias === 1 ? "mañana es el evento" : "falta una semana para el evento"} que tienes a tu cargo.</p>
 </td></tr>
 <tr><td style="padding:10px 19px 4px"><table width="100%" cellpadding="0" cellspacing="0">
  <tr>${caja("Fecha", fin ? `${corta(e.fecha_desde)} al ${corta(fin)}` : larga(e.fecha_desde), 2)}</tr>
  <tr>${caja("Hora", esc(e.hora || "Por definir"))}${caja("Lugar", esc(e.lugar || "Por confirmar"))}</tr>
 </table></td></tr>
 <tr><td style="padding:12px 24px 6px">${lista}</td></tr>
 <tr><td style="padding:14px 24px 30px"><table cellpadding="0" cellspacing="0"><tr>
  <td style="padding-right:8px"><a href="${PANEL}/borradores/panel.html" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:12px">Abrir en Rabbit</a></td>
  <td><a href="${gcal}" style="display:inline-block;border:1px solid #d4d4d8;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:700;padding:11px 16px;border-radius:12px">Añadir a Google Calendar</a></td>
 </tr></table></td></tr>
</table>
<p style="font-size:11px;color:#a1a1aa;margin:16px 0 0">Correo automático de Rabbit | iPartner</p>
</td></tr></table></body></html>`;
}

// Correo simple al equipo (Marketing y Legal) cuando a un evento cercano le faltan datos
function correoFalta(e: Ev, dias: number, falta: string[]) {
  const T = TIPO[e.tipo] || TIPO.interno;
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e4e4e7">
 <tr><td style="background:#0a0a0a;padding:20px 24px;color:#ffffff;font-size:16px;font-weight:700">rabbit ai<span style="float:right;background:#dc2626;color:#fff;font-size:12px;padding:4px 10px;border-radius:999px">Faltan ${dias} día${dias === 1 ? "" : "s"}</span></td></tr>
 <tr><td style="padding:24px">
  <span style="display:inline-block;background:${T.f};color:${T.tx};font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px">${T.t}</span>
  <h1 style="margin:12px 0 6px;font-size:22px;color:#0a0a0a">${esc(e.nombre)}</h1>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#52525b">El evento es el <b>${larga(e.fecha_desde)}</b> y todavía falta completar esto:</p>
  ${falta.map((f) => `<div style="background:#fff8e6;border:1px solid #f3dfa5;border-radius:10px;padding:10px 12px;margin-bottom:6px;font-size:14px;color:#7a5a00;font-weight:700">${esc(f)}</div>`).join("")}
  <a href="${PANEL}/borradores/panel.html" style="display:inline-block;margin-top:14px;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:12px">Completar en Rabbit</a>
 </td></tr></table><p style="font-size:11px;color:#a1a1aa;margin:16px 0 0">Correo automático de Rabbit | iPartner</p></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const { clave, prueba } = await req.json().catch(() => ({}));
  if (clave !== CORREO_CLAVE) return new Response("no autorizado", { status: 401 });
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const { data: gente } = await sb.from("perfiles").select("id, nombre, correo, rol, activa, area");
  const persona = new Map((gente || []).map((p) => [p.id, p]));
  const jefa = (gente || []).find((p) => p.rol === "jefa");
  const enviados: string[] = [];
  for (const aviso of AVISOS) {
    const dia = suma(hoy, aviso.dias);
    const { data: evs, error } = await sb.from("eventos").select("*").eq("fecha_desde", dia);
    if (error) return new Response(error.message, { status: 500 });
    for (const e of (evs || []) as Ev[]) {
      const { data: ts } = await sb.from("evento_tareas").select("texto, fecha, hecha, encargados").eq("evento_id", e.id);
      const para = e.encargados.length ? e.encargados : jefa ? [jefa.id] : [];
      for (const pid of para) {
        const p = persona.get(pid); if (!p || !p.activa || !p.correo) continue;
        if (prueba && p.correo !== prueba) continue;
        // un solo aviso de cada tipo por persona y evento
        const { error: dup } = await sb.from("comunicados_enviados").insert({ tipo: `${aviso.clave}-${e.id}`, perfil: pid, fecha: dia });
        if (dup) continue;
        const mias = (ts || []).filter((t) => !t.hecha && (t.encargados || []).includes(pid)).sort((a, b) => String(a.fecha || "9").localeCompare(String(b.fecha || "9")));
        const r = await fetch(CORREO_URL, { method: "POST", body: JSON.stringify({ clave: CORREO_CLAVE, para: p.correo, asunto: aviso.asunto(e.nombre), html: correo(e, aviso, p.nombre, mias) }) });
        const txt = await r.text();
        if (!txt.includes("ok")) { console.error("No se envió a", p.correo, txt); await sb.from("comunicados_enviados").delete().match({ tipo: `${aviso.clave}-${e.id}`, perfil: pid, fecha: dia }); continue; }
        enviados.push(`${p.nombre}: ${aviso.clave} ${e.nombre}`);
      }
    }
  }
  // Datos que faltan: se avisa a todo Marketing y Legal 7, 3 y 1 día antes
  const equipo = (gente || []).filter((p) => p.activa && p.correo && (p.rol !== "solicitante" || p.area === "Legal"));
  for (const dias of [7, 3, 1]) {
    const { data: evs } = await sb.from("eventos").select("*").eq("fecha_desde", suma(hoy, dias));
    for (const e of (evs || []) as Ev[]) {
      const { data: ts } = await sb.from("evento_tareas").select("hecha, encargados").eq("evento_id", e.id);
      const falta: string[] = [];
      if (!e.lugar) falta.push("Falta el lugar"); if (!e.hora) falta.push("Falta el horario"); if (!e.encargados.length) falta.push("No tiene encargados");
      if (!ts || !ts.length) falta.push("No tiene tareas"); else { const p = ts.filter((t) => !t.hecha); if (p.length) falta.push(`${p.length} tarea${p.length === 1 ? "" : "s"} sin terminar`); if (p.some((t) => !(t.encargados || []).length)) falta.push("Hay tareas sin responsable"); }
      if (!falta.length) continue;
      for (const p of equipo) {
        if (prueba && p.correo !== prueba) continue;
        const { error: dup } = await sb.from("comunicados_enviados").insert({ tipo: `evf${dias}-${e.id}`, perfil: p.id, fecha: hoy });
        if (dup) continue;
        const r = await fetch(CORREO_URL, { method: "POST", body: JSON.stringify({ clave: CORREO_CLAVE, para: p.correo, asunto: `Faltan datos para ${e.nombre} (en ${dias} día${dias === 1 ? "" : "s"})`, html: correoFalta(e, dias, falta) }) });
        if (!(await r.text()).includes("ok")) { await sb.from("comunicados_enviados").delete().match({ tipo: `evf${dias}-${e.id}`, perfil: p.id, fecha: hoy }); continue; }
        enviados.push(`${p.nombre}: faltan datos ${e.nombre}`);
      }
    }
  }
  return new Response(JSON.stringify({ hoy, enviados }), { headers: { "Content-Type": "application/json" } });
});
