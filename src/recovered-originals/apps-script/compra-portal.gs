/**
 * COMPRA INTELIGENTE AUTOMOTRIZ CLASA®
 * PORTAL DEL CLIENTE — SERVIDOR
 *
 * Proyecto separado del panel interno.
 * Objetivo:
 * - Recibir documentos PDF ligados al folio.
 * - Recibir solicitud de cita/revisión ligada al folio.
 * - No exponer información interna, márgenes, gastos ni decisiones.
 *
 * Script Properties requeridas:
 *   CI_PORTAL_SECRET       secreto compartido con el proyecto interno
 * Opcionales:
 *   CI_SPREADSHEET_ID      por defecto usa la base oficial
 *   CI_ROOT_FOLDER_ID      carpeta raíz de expedientes; si falta se busca por nombre
 */




var CI_PORTAL_DEFAULT_SPREADSHEET_ID = '1DKC-bRZOQuvqZjfe9i5APgMfVyvDtKYJgxf2F1-SPx8';
var CI_PORTAL_ROOT_FOLDER_NAME = 'COMPRA INTELIGENTE CLASA';
var CI_PORTAL_SHEET_EXPEDIENTES = 'CI_EXPEDIENTES';
var CI_PORTAL_SHEET_ARCHIVOS = 'CI_ARCHIVOS';
var CI_PORTAL_SHEET_CITAS = 'CI_SOLICITUDES_CITA';




var CI_PORTAL_REVIEW_DOCS = [
  {category:'INE_VENDEDOR', label:'INE del vendedor'},
  {category:'FACTURA_REFACTURAS', label:'Factura y refacturas completas'},
  {category:'ENDOSO', label:'Endoso'},
  {category:'INE_ULTIMO_DUENO', label:'INE del último dueño'},
  {category:'TARJETA_CIRCULACION', label:'Tarjeta de circulación'}
];




function doGet(e) {
  e = e || {};
  var p = e.parameter || {};
  var folio = CI_portalText_(p.folio);
  var token = CI_portalText_(p.token);
  var accion = CI_portalText_(p.accion).toLowerCase();




  if (['documentos','cita'].indexOf(accion) < 0) accion = 'documentos';




  var t = HtmlService.createTemplateFromFile('PortalCliente');
  t.PORTAL_FOLIO = folio;
  t.PORTAL_TOKEN = token;
  t.PORTAL_ACCION = accion;
  t.PORTAL_VALIDO = Boolean(folio && token && CI_portalValidarToken_(folio, token) && CI_portalFolioExiste_(folio));




  return t.evaluate()
    .setTitle('Automotriz CLASA® · Compra Inteligente')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}




function CI_portalEstado(payload) {
  payload = CI_portalObject_(payload);
  var folio = CI_portalText_(payload.folio);
  var token = CI_portalText_(payload.token);
  CI_portalExigirAcceso_(folio, token);




  var ss = CI_portalSpreadsheet_();
  var exp = ss.getSheetByName(CI_PORTAL_SHEET_EXPEDIENTES);
  if (!exp) throw new Error('Expediente no disponible.');




  var row = CI_portalFindRow_(exp, folio);
  if (!row) throw new Error('No se encontró el folio.');




  var r = exp.getRange(row, 1, 1, 12).getDisplayValues()[0];
  var estadoDocs = CI_portalEstadoDocs_(folio);




  return {
    ok:true,
    folio:folio,
    cliente:r[5] || '',
    vehiculo:r[7] || '',
    estatus:r[4] || '',
    documentos:estadoDocs.documentos,
    faltantes:estadoDocs.faltantes
  };
}




function CI_portalSubirDocumento(payload) {
  payload = CI_portalObject_(payload);
  var folio = CI_portalText_(payload.folio);
  var token = CI_portalText_(payload.token);
  CI_portalExigirAcceso_(folio, token);




  var category = CI_portalText_(payload.categoria);
  var allowed = CI_PORTAL_REVIEW_DOCS.map(function(d){return d.category;});
  if (allowed.indexOf(category) < 0) {
    throw new Error('Tipo de documento no autorizado.');
  }


  var originalName = CI_portalFileName_(payload.nombre || category + '.pdf');
  var mime = CI_portalText_(payload.mimeType);
  if ((mime && mime !== 'application/pdf') || !/\.pdf$/i.test(originalName)) {
    throw new Error('Solo se aceptan archivos PDF.');
  }




  var bytes = Utilities.base64Decode(CI_portalText_(payload.base64));
  if (!bytes.length) throw new Error('El PDF está vacío.');
  if (bytes.length > 8 * 1024 * 1024) throw new Error('El PDF supera el límite de 8 MB.');
  if (bytes.length < 8 || bytes.slice(0, 5).map(function(b){return b & 255;}).join(',') !== '37,80,68,70,45') {
    throw new Error('El archivo no contiene un PDF válido.');
  }
  var folder = CI_portalFolioFolder_(folio);
  var evidence = CI_portalChildFolder_(folder, 'EVIDENCIAS');
  var stamped = category + '_' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') +
    '_' + originalName;




  var file = evidence.createFile(Utilities.newBlob(bytes, MimeType.PDF, stamped));




  var ss = CI_portalSpreadsheet_();
  var sh = CI_portalSheet_(ss, CI_PORTAL_SHEET_ARCHIVOS, [
    'Fecha','Folio','Categoría','Nombre','Archivo ID','URL','Tipo MIME'
  ]);
  sh.appendRow([new Date(), folio, category, stamped, file.getId(), file.getUrl(), MimeType.PDF]);
  sh.getRange(sh.getLastRow(),1).setNumberFormat('dd/mm/yyyy hh:mm');




  return {
    ok:true,
    folio:folio,
    categoria:category,
    nombre:stamped,
    estado:CI_portalEstadoDocs_(folio)
  };
}




function CI_portalSolicitarCita(payload) {
  payload = CI_portalObject_(payload);
  var folio = CI_portalText_(payload.folio);
  var token = CI_portalText_(payload.token);
  CI_portalExigirAcceso_(folio, token);




  var nombre = CI_portalText_(payload.nombre);
  var telefono = CI_portalText_(payload.telefono);
  var fecha = CI_portalText_(payload.fecha);
  var hora = CI_portalText_(payload.hora);
  var observaciones = CI_portalText_(payload.observaciones);




  if (!nombre) throw new Error('Escribe tu nombre.');
  if (!telefono) throw new Error('Escribe tu teléfono.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Selecciona una fecha válida.');
  if (!/^\d{2}:\d{2}$/.test(hora)) throw new Error('Selecciona una hora válida.');




  var hh = Number(hora.slice(0,2));
  var mm = Number(hora.slice(3,5));
  if (hh < 10 || hh > 17 || (hh === 17 && mm > 0)) {
    throw new Error('Las revisiones se solicitan entre 10:00 y 17:00.');
  }




  var requested = new Date(fecha + 'T' + hora + ':00');
  if (isNaN(requested.getTime())) throw new Error('Fecha u hora inválida.');
  if (requested.getTime() < Date.now()) throw new Error('Selecciona una fecha y hora futuras.');




  var ss = CI_portalSpreadsheet_();
  var sh = CI_portalSheet_(ss, CI_PORTAL_SHEET_CITAS, [
    'Fecha solicitud','Folio','Cliente','Teléfono','Fecha solicitada','Hora solicitada',
    'Estatus','Observaciones','Confirmada por','Fecha confirmación'
  ]);




  var pendingRow = 0;
  if (sh.getLastRow() >= 2) {
    var citas = sh.getRange(2, 2, sh.getLastRow()-1, 6).getDisplayValues();
    for (var i=citas.length-1;i>=0;i--) {
      if (CI_portalText_(citas[i][0]) === folio &&
          CI_portalText_(citas[i][5]) === 'PENDIENTE DE CONFIRMACIÓN') {
        pendingRow = i+2;
        break;
      }
    }
  }
  var values = [new Date(), folio, nombre, telefono, fecha, hora,
    'PENDIENTE DE CONFIRMACIÓN', observaciones, '', ''];
  if (pendingRow) sh.getRange(pendingRow,1,1,values.length).setValues([values]);
  else { sh.appendRow(values); pendingRow = sh.getLastRow(); }
  sh.getRange(pendingRow,1).setNumberFormat('dd/mm/yyyy hh:mm');




  return {
    ok:true,
    folio:folio,
    estatus:'PENDIENTE DE CONFIRMACIÓN',
    mensaje:'Recibimos tu solicitud de revisión. Automotriz CLASA® confirmará contigo el día y la hora.'
  };
}




function CI_portalEstadoDocs_(folio) {
  var ss = CI_portalSpreadsheet_();
  var sh = CI_portalSheet_(ss, CI_PORTAL_SHEET_ARCHIVOS, [
    'Fecha','Folio','Categoría','Nombre','Archivo ID','URL','Tipo MIME'
  ]);
  var received = {};
  if (sh.getLastRow() >= 2) {
    var rows = sh.getRange(2,1,sh.getLastRow()-1,7).getValues();
    rows.forEach(function(r){
      if (CI_portalText_(r[1]) === folio) received[CI_portalText_(r[2])] = true;
    });
  }
  var documentos = CI_PORTAL_REVIEW_DOCS.map(function(d){
    return {categoria:d.category, documento:d.label, recibido:Boolean(received[d.category])};
  });
  return {
    documentos:documentos,
    faltantes:documentos.filter(function(d){return !d.recibido;})
  };
}




function CI_portalValidarToken_(folio, token) {
  var secret = PropertiesService.getScriptProperties().getProperty('CI_PORTAL_SECRET');
  if (!secret) return false;
  var sig = Utilities.computeHmacSha256Signature(folio, secret);
  var expected = Utilities.base64EncodeWebSafe(sig).replace(/=+$/,'').slice(0,32);
  return CI_portalSafeEqual_(expected, token);
}




function CI_portalExigirAcceso_(folio, token) {
  if (!folio || !token || !CI_portalValidarToken_(folio, token) || !CI_portalFolioExiste_(folio)) {
    throw new Error('Enlace inválido o vencido. Solicita a Automotriz CLASA® un enlace nuevo.');
  }
}


function CI_portalFolioExiste_(folio) {
  var sh = CI_portalSpreadsheet_().getSheetByName(CI_PORTAL_SHEET_EXPEDIENTES);
  return Boolean(sh && CI_portalFindRow_(sh, folio));
}


function CI_portalJson_(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}


function CI_portalSafeEqual_(a,b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  var result = 0;
  for (var i=0;i<a.length;i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}




function CI_portalSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('CI_SPREADSHEET_ID') ||
    CI_PORTAL_DEFAULT_SPREADSHEET_ID;
  return SpreadsheetApp.openById(id);
}




function CI_portalRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CI_ROOT_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  var it = DriveApp.getFoldersByName(CI_PORTAL_ROOT_FOLDER_NAME);
  if (!it.hasNext()) throw new Error('No se encontró la carpeta de expedientes.');
  return it.next();
}




function CI_portalFolioFolder_(folio) {
  return CI_portalChildFolder_(CI_portalRootFolder_(), CI_portalFileName_(folio));
}




function CI_portalChildFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}




function CI_portalSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && headers.length && sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.getRange(1,1,1,headers.length)
      .setFontWeight('bold').setBackground('#101820').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}




function CI_portalFindRow_(sheet, folio) {
  if (sheet.getLastRow() < 2) return 0;
  var found = sheet.getRange(2,1,sheet.getLastRow()-1,1)
    .createTextFinder(folio).matchEntireCell(true).findNext();
  return found ? found.getRow() : 0;
}




function CI_portalFileName_(value) {
  return CI_portalText_(value)
    .replace(/[\\/:*?"<>|#%{}\[\]]/g,'_')
    .replace(/\s+/g,'_').slice(0,150) || 'ARCHIVO';
}




function CI_portalObject_(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}




function CI_portalText_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}