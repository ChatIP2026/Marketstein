# Genera rabbit-prueba.html (versión descargable con datos de ejemplo) a partir de panel.html
s = open("panel.html").read()
R = [
    ('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n', ''),
    ('let yo = "Ariana";\n  try { yo = localStorage.getItem("rabbit-yo") || yo; } catch (e) {}', 'let yo = "Hilary";'),
    ('const WEB_REAL = /vercel\\.app$/.test(location.hostname);', 'const WEB_REAL = false;'),
    ('document.getElementById("mpSalir").onclick = () => { location.href = "login.html"; };',
     'document.getElementById("mpSalir").onclick = () => { menuPerfil.hidden = true; avisar("Esta es una versión de prueba: no hay sesión que cerrar"); };'),
    ('<details class="mp-demo"><summary>Vista previa: cambiar de persona</summary>', '<details class="mp-demo" open><summary>Entrar como otra persona</summary>'),
    ('<title>', '<title>Prueba | '),
]
for a, b in R:
    assert a in s, a
    s = s.replace(a, b, 1)
s = s.replace('localStorage.setItem("rabbit-yo", yo)', 'localStorage.setItem("rabbit-demo-yo", yo)').replace("rabbit_filtros", "rabbit_demo_filtros")
banner = '''<div id="demoBanner" style="position:fixed;left:16px;bottom:16px;z-index:350;max-width:300px;background:#0a0a0a;color:#fff;border-radius:14px;padding:12px 14px;font:500 .8rem/1.4 Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)"><b style="display:block;font-size:.85rem;margin-bottom:3px">Versión de prueba</b>Los datos son inventados y nada se guarda. Para entrar como otra persona, toca tu foto arriba a la derecha y, en "Entrar como otra persona", elige a alguien de "Otras áreas". <button onclick="this.parentElement.remove()" style="all:unset;cursor:pointer;display:block;margin-top:6px;text-decoration:underline">Entendido</button></div>
</body>'''
extra = """<script>
  // Proyectos de ejemplo extra: 7 por categoría
  (() => {
    const N = ["Campaña Navidad", "Video institucional", "Rediseño web", "Webinar fintech", "Newsletter mensual", "Kit de prensa", "Post LinkedIn", "Brochure ventas", "Evento clientes", "Catálogo 2027", "Reels de equipo", "Encuesta NPS", "Landing créditos", "Manual de marca", "Podcast T2", "Ads Google"];
    const T = ["Brief inicial", "Bocetos", "Revisión con Hilary", "Ajustes finales", "Publicar", "Medir resultados"];
    const enc = ["Ariana", "Carlos", "Pierina", "Hilary"], pr = ["alta", "media", "baja"];
    let id = 5000, k = 0;
    for (const e of ["sin_empezar", "en_curso", "listo"]) {
      for (let i = [...mapaP.values()].filter((p) => p.estado === e).length; i < 7; i++, k++) {
        const pid = ++id, d = new Date(); d.setDate(d.getDate() + 3 + k * 2);
        mapaP.set(pid, { id: pid, nombre: N[k % N.length], estado: e, prioridad: pr[k % 3], encargados: [enc[k % 4]], fecha_limite: d.toISOString().slice(0, 10), created_at: new Date().toISOString(), creado_por: "Hilary" });
        const tot = 4 + (k % 3), h = e === "listo" ? tot : e === "en_curso" ? 1 + (k % 3) : 0;
        for (let j = 0; j < tot; j++) { const tid = ++id; mapaT.set(tid, { id: tid, proyecto_id: pid, texto: T[j], hecha: j < h, hecha_at: j < h ? new Date().toISOString() : null, encargado: enc[k % 4], created_at: new Date().toISOString() }); }
      }
    }
    armar();
  })();
</script>
"""
s = s[:s.rindex("</body>")] + extra + s[s.rindex("</body>"):]
i = s.rindex("</body>")
s = s[:i] + banner + s[i + 7:]
open("rabbit-prueba.html", "w").write(s)
