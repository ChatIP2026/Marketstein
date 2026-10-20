// Pegar en https://script.google.com con la cuenta de Gmail de Rabbit.
// Implementar > Nueva implementación > Aplicación web | Ejecutar como: Yo | Quién tiene acceso: Cualquier usuario
const CLAVE = "CAMBIA-ESTA-CLAVE"; // la misma que pondrás en Supabase como CORREO_CLAVE

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.clave !== CLAVE) return ContentService.createTextOutput("clave incorrecta");
  MailApp.sendEmail({ to: d.para, subject: d.asunto, htmlBody: d.html, name: "Rabbit" });
  return ContentService.createTextOutput("ok");
}

// Prueba: elige esta función arriba y pulsa Ejecutar. Te llega un correo a ti mismo.
function prueba() {
  MailApp.sendEmail({ to: Session.getActiveUser().getEmail(), subject: "Prueba de Rabbit", htmlBody: "<b>Funciona</b>", name: "Rabbit" });
}
