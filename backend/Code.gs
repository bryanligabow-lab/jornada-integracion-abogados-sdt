/**
 * ===========================================================================
 *  Jornada de Integración · Colegio de Abogados de Santo Domingo de los Tsáchilas
 *  Backend: Google Apps Script  (base de datos = Google Sheets + correo)
 * ---------------------------------------------------------------------------
 *  Qué hace:
 *   1. Recibe el registro del formulario (POST JSON).
 *   2. Lo guarda como una fila en la hoja "Asistencia".
 *   3. Envía un correo de notificación al organizador.
 *   4. Envía un correo de confirmación al colega que se registró.
 *
 *  Instalación: ver README.md (paso 2).
 * ===========================================================================
 */

/* ----------------------------- CONFIGURACIÓN ----------------------------- */
var CONFIG = {
  HOJA:       'Asistencia',
  NOTIFICAR:  'ab.lenincarrion21@gmail.com',   // recibe el aviso de cada registro
  EVENTO:     'Jornada de Integración · Colegio de Abogados de SDT',
  FECHA:      'Sábado 05 de septiembre de 2026 · 10h00',
  LUGAR:      'Quinta del Dr. Carlos Vivanco (Quinta Aventino) — Km 10 vía Chone, margen derecho, 500 m por la escultura de León.',
  ADMIN_KEY:  'casdt2026',                     // clave para consultar la lista por GET
  CONFIRMAR_AL_COLEGA: true                    // false = no enviar copia al registrado
};

var CABECERAS = [
  'Fecha de registro', 'Código', 'Nombres y apellidos', 'Cédula', 'Matrícula',
  'Celular', 'Correo', 'Asistencia', 'Acompañantes', 'Actividades deportivas',
  'Comentario', 'Total personas', 'Origen'
];

/* --------------------------------- POST --------------------------------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    var nombre = limpiar_(d.nombre);
    var cedula = String(limpiar_(d.cedula)).replace(/\D+/g, '');
    var email  = limpiar_(d.email).toLowerCase();

    if (!nombre || cedula.length !== 10 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      return json_({ ok: false, error: 'Datos incompletos o inválidos' });
    }

    var hoja  = hoja_();
    var ahora = new Date();
    var viene = String(d.asistencia || '').indexOf('Sí') === 0;
    var acomp = Math.max(0, Math.min(10, Number(d.acompanantes) || 0));

    var fila = [
      ahora,
      codigo_(cedula),
      nombre,
      "'" + cedula,
      limpiar_(d.matricula),
      "'" + String(limpiar_(d.telefono)).replace(/\D+/g, ''),
      email,
      limpiar_(d.asistencia),
      viene ? acomp : 0,
      limpiar_(d.deporte),
      limpiar_(d.comentario),
      viene ? acomp + 1 : 0,
      limpiar_(d.origen) || 'web'
    ];

    // Si la cédula ya existe, actualizamos ese registro en lugar de duplicarlo.
    var existente = buscarFila_(hoja, cedula);
    if (existente > 0) {
      hoja.getRange(existente, 1, 1, fila.length).setValues([fila]);
    } else {
      hoja.appendRow(fila);
    }

    var resumen = { total: 0, personas: 0, si: 0, no: 0 };
    try { resumen = resumen_(hoja); } catch (err) {}

    notificar_(fila, existente > 0, resumen);
    if (CONFIG.CONFIRMAR_AL_COLEGA && viene) { confirmar_(nombre, email, acomp); }

    return json_({
      ok: true,
      registro: codigo_(cedula),
      actualizado: existente > 0,
      totales: resumen
    });

  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

/* ---------------------------------- GET ---------------------------------- */
/**
 *  ?ping=1                      → comprueba que la app responde
 *  ?admin=CLAVE                 → JSON con todos los registros
 *  ?admin=CLAVE&formato=csv     → descarga CSV
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ping) return json_({ ok: true, servicio: 'registro-asistencia', evento: CONFIG.EVENTO });

  if (p.admin !== CONFIG.ADMIN_KEY) {
    return json_({ ok: false, error: 'No autorizado' });
  }

  var hoja = hoja_();
  var datos = hoja.getDataRange().getValues();

  if (p.formato === 'csv') {
    var csv = datos.map(function (r) {
      return r.map(function (c) {
        var v = (c instanceof Date) ? Utilities.formatDate(c, 'America/Guayaquil', 'yyyy-MM-dd HH:mm') : String(c);
        return '"' + v.replace(/^'/, '').replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
  }

  var cab = datos.shift() || [];
  var lista = datos.map(function (r) {
    var o = {};
    cab.forEach(function (k, i) {
      o[k] = (r[i] instanceof Date)
        ? Utilities.formatDate(r[i], 'America/Guayaquil', 'yyyy-MM-dd HH:mm')
        : String(r[i]).replace(/^'/, '');
    });
    return o;
  });

  return json_({ ok: true, totales: resumen_(hoja), registros: lista });
}

/* -------------------------------- CORREOS -------------------------------- */
function notificar_(f, actualizado, r) {
  var titulo = (actualizado ? '🔄 Registro actualizado' : '✅ Nuevo registro') + ': ' + f[2];
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e3e3e3;border-radius:10px;overflow:hidden">' +
      '<div style="background:#07231c;padding:18px 20px;color:#fff">' +
        '<p style="margin:0;font-size:12px;letter-spacing:1px;color:#f0b323">COLEGIO DE ABOGADOS DE SANTO DOMINGO DE LOS TSÁCHILAS</p>' +
        '<h2 style="margin:6px 0 0;font-size:19px">' + titulo + '</h2>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
        filaHtml_('Nombres y apellidos', f[2]) +
        filaHtml_('Cédula', String(f[3]).replace(/^'/, '')) +
        filaHtml_('Matrícula', f[4] || '—') +
        filaHtml_('Celular / WhatsApp', String(f[5]).replace(/^'/, '')) +
        filaHtml_('Correo', f[6]) +
        filaHtml_('Asistencia', '<b>' + f[7] + '</b>') +
        filaHtml_('Acompañantes', f[8]) +
        filaHtml_('Actividades deportivas', f[9]) +
        filaHtml_('Comentario', f[10] || '—') +
        filaHtml_('Código', f[1]) +
      '</table>' +
      '<div style="background:#f7f3e8;padding:16px 20px;font-size:13px;color:#0d1b16">' +
        '<b>Acumulado:</b> ' + r.si + ' confirmados · ' + r.no + ' no asisten · ' +
        '<b>' + r.personas + ' personas</b> esperadas (incluye acompañantes).' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: CONFIG.NOTIFICAR,
    subject: titulo + ' — ' + CONFIG.EVENTO,
    htmlBody: html,
    replyTo: f[6],
    name: 'Registro Jornada de Integración'
  });
}

function confirmar_(nombre, email, acomp) {
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e3e3e3;border-radius:10px;overflow:hidden">' +
      '<div style="background:#07231c;padding:22px 20px;text-align:center;color:#fff">' +
        '<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#7ed957">¡Unidos somos más fuertes!</p>' +
        '<h1 style="margin:8px 0 0;font-size:24px">Tu asistencia está confirmada</h1>' +
      '</div>' +
      '<div style="padding:22px 20px;color:#0d1b16;font-size:14px;line-height:1.6">' +
        '<p style="margin:0 0 14px">Estimado/a colega <b>' + nombre + '</b>,</p>' +
        '<p style="margin:0 0 14px">Hemos recibido su registro para la <b>Jornada de Integración</b> del Colegio de Abogados de Santo Domingo de los Tsáchilas.</p>' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">' +
          filaHtml_('Fecha y hora', CONFIG.FECHA) +
          filaHtml_('Lugar', CONFIG.LUGAR) +
          filaHtml_('Acompañantes', String(acomp)) +
        '</table>' +
        '<p style="margin:0 0 14px">Se brindará <b>un plato de fritada</b> para compartir, y disfrutaremos de actividades deportivas, recreativas y bailables.</p>' +
        '<p style="margin:0">¡Le esperamos para seguir fortaleciendo nuestra gran familia de abogados!</p>' +
      '</div>' +
      '<div style="background:#c8102e;padding:14px 20px;text-align:center;color:#fff;font-size:11px;letter-spacing:.5px">' +
        'COLEGIO DE ABOGADOS DE SANTO DOMINGO DE LOS TSÁCHILAS' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: email,
    subject: 'Confirmación de asistencia · Jornada de Integración (05/09/2026)',
    htmlBody: html,
    name: 'Colegio de Abogados de Santo Domingo de los Tsáchilas',
    replyTo: CONFIG.NOTIFICAR
  });
}

function filaHtml_(k, v) {
  return '<tr>' +
    '<td style="padding:9px 20px;border-bottom:1px solid #eee;color:#666;width:42%">' + k + '</td>' +
    '<td style="padding:9px 20px;border-bottom:1px solid #eee;color:#0d1b16">' + v + '</td>' +
  '</tr>';
}

/* -------------------------------- UTILIDADES ------------------------------ */
function hoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(CONFIG.HOJA) || ss.insertSheet(CONFIG.HOJA);
  if (h.getLastRow() === 0) {
    h.appendRow(CABECERAS);
    h.getRange(1, 1, 1, CABECERAS.length)
      .setFontWeight('bold').setBackground('#07231c').setFontColor('#ffffff');
    h.setFrozenRows(1);
    h.setColumnWidth(1, 150); h.setColumnWidth(3, 230); h.setColumnWidth(7, 220);
  }
  return h;
}

function buscarFila_(hoja, cedula) {
  var n = hoja.getLastRow();
  if (n < 2) return 0;
  var col = hoja.getRange(2, 4, n - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).replace(/\D+/g, '') === cedula) return i + 2;
  }
  return 0;
}

function resumen_(hoja) {
  var n = hoja.getLastRow();
  var r = { total: 0, personas: 0, si: 0, no: 0 };
  if (n < 2) return r;
  var v = hoja.getRange(2, 8, n - 1, 5).getValues();   // Asistencia .. Total personas
  v.forEach(function (row) {
    r.total++;
    if (String(row[0]).indexOf('Sí') === 0) { r.si++; r.personas += Number(row[4]) || 1; }
    else { r.no++; }
  });
  return r;
}

function codigo_(cedula) {
  return 'JI26-' + cedula.slice(-4);
}

function limpiar_(v) {
  return String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, 500);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Ejecuta esta función una vez desde el editor para autorizar los permisos. */
function prueba() {
  hoja_();
  Logger.log(JSON.stringify(resumen_(hoja_())));
}
