/**
 * COMPRA INTELIGENTE CLASA® — FLUJO OPERATIVO WEB
 * Módulo complementario. No modifica CLASA_v6.gs ni reemplaza cotizarDesdeWeb().
 *
 * Configuración opcional en Propiedades de la secuencia de comandos:
 *   CI_SPREADSHEET_ID   ID del archivo de control.
 *   CI_ROOT_FOLDER_ID   Carpeta raíz para expedientes y PDFs.
 *   CI_LOGO_FILE_ID     Imagen del logo oficial en Drive.
 */




var CI_DEFAULT_SPREADSHEET_ID = '1DKC-bRZOQuvqZjfe9i5APgMfVyvDtKYJgxf2F1-SPx8';
var CI_SHEET_EXPEDIENTES = 'CI_EXPEDIENTES';
var CI_SHEET_ARCHIVOS = 'CI_ARCHIVOS';
var CI_ROOT_FOLDER_NAME = 'COMPRA INTELIGENTE CLASA';
var CI_INVENTORY_SPREADSHEET_ID = '1X-qOPULagTNcsT0rdA8Lp6Whm0qfcnvZ6sfmIv-zwLI';
var CI_INVENTORY_SHEET = 'INVENTARIO';
var CI_INVENTORY_HEADER_ROW = 4;




// Documentación mínima para la REVISIÓN del vehículo. Todo debe recibirse en PDF.
var CI_REVIEW_DOCS = [
  {category: 'INE_VENDEDOR', label: 'INE del vendedor'},
  {category: 'FACTURA_REFACTURAS', label: 'Factura y refacturas completas'},
  {category: 'ENDOSO', label: 'Endoso'},
  {category: 'INE_ULTIMO_DUENO', label: 'INE del último dueño'},
  {category: 'TARJETA_CIRCULACION', label: 'Tarjeta de circulación'}
];




function CI_prepararSistema() {
  var ss = CI_spreadsheet_();
  CI_sheet_(ss, CI_SHEET_EXPEDIENTES, [
    'Folio', 'Actualizado', 'Módulo', 'Etapa', 'Estatus', 'Cliente', 'Teléfono',
    'Vehículo', 'Propuesta inicial', 'Propuesta final', 'Datos JSON', 'Carpeta ID'
  ]);
  CI_sheet_(ss, CI_SHEET_ARCHIVOS, [
    'Fecha', 'Folio', 'Categoría', 'Nombre', 'Archivo ID', 'URL', 'Tipo MIME'
  ]);
  var folder = CI_rootFolder_();
  return {
    ok: true,
    spreadsheetId: ss.getId(),
    rootFolderId: folder.getId(),
    message: 'Sistema Compra Inteligente CLASA preparado.'
  };
}




function CI_guardarExpedienteWeb(payload) {
  payload = CI_object_(payload);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = CI_spreadsheet_();
    var sh = CI_sheet_(ss, CI_SHEET_EXPEDIENTES, [
      'Folio', 'Actualizado', 'Módulo', 'Etapa', 'Estatus', 'Cliente', 'Teléfono',
      'Vehículo', 'Propuesta inicial', 'Propuesta final', 'Datos JSON', 'Carpeta ID'
    ]);
    var folio = CI_text_(payload.folio) || CI_newFolio_();
    payload.folio = folio;
    payload.actualizado = new Date().toISOString();
    var folder = CI_folioFolder_(folio);
    var campos = CI_object_(payload.campos);
    var vehiculo = CI_object_(payload.vehiculo);
    var status = CI_status_(payload);
    var json = CI_jsonForCell_(payload);
    var row = CI_findRow_(sh, folio);
    var values = [[
      folio,
      new Date(),
      Number(payload.modulo || 1),
      CI_text_(payload.etapa),
      status,
      CI_text_(campos.clienteNombre),
      CI_text_(campos.clienteTelefono),
      CI_vehicle_(vehiculo),
      Number(payload.propuestaInicial || 0),
      Number(payload.propuestaFinal || 0),
      json,
      folder.getId()
    ]];
    if (row) sh.getRange(row, 1, 1, values[0].length).setValues(values);
    else {
      sh.getRange(sh.getLastRow() + 1, 1, 1, values[0].length).setValues(values);
      row = sh.getLastRow();
    }
    sh.getRange(row, 2).setNumberFormat('dd/mm/yyyy hh:mm');
    sh.getRange(row, 9, 1, 2).setNumberFormat('$#,##0');
    var inventario = null;
    if (payload.confirmarInventario === true) {
      try { inventario = CI_sincronizarInventario_(payload); } catch (invErr) { inventario = {ok:false, error: String(invErr && invErr.message || invErr)}; }
    }
    return {ok: true, folio: folio, row: row, status: status, folderId: folder.getId(), inventario: inventario};
  } finally {
    lock.releaseLock();
  }
}




function CI_obtenerExpedienteWeb(request) {
  var folio = CI_text_(CI_object_(request).folio);
  if (!folio) throw new Error('Falta el folio del expediente.');
  var sh = CI_sheet_(CI_spreadsheet_(), CI_SHEET_EXPEDIENTES, []);
  var row = CI_findRow_(sh, folio);
  if (!row) throw new Error('No se encontró el expediente ' + folio + '.');
  var data = sh.getRange(row, 1, 1, 12).getValues()[0];
  var parsed = {};
  try { parsed = JSON.parse(data[10] || '{}'); } catch (err) { parsed = {}; }
  parsed.folio = data[0];
  parsed.actualizado = data[1];
  parsed.modulo = data[2];
  parsed.etapa = data[3];
  parsed.estatus = data[4];
  return parsed;
}




function CI_listarExpedientesWeb(request) {
  request = CI_object_(request);
  var limit = Math.max(1, Math.min(100, Number(request.limite || 20)));
  var sh = CI_sheet_(CI_spreadsheet_(), CI_SHEET_EXPEDIENTES, []);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var start = Math.max(2, last - limit + 1);
  var rows = sh.getRange(start, 1, last - start + 1, 12).getValues().reverse();
  return rows.map(function (r) {
    return {
      folio: r[0],
      actualizado: CI_dateLabel_(r[1]),
      modulo: r[2],
      etapa: r[3],
      estatus: r[4],
      cliente: r[5],
      telefono: r[6],
      vehiculo: r[7],
      propuestaInicial: r[8],
      propuestaFinal: r[9]
    };
  });
}




function CI_subirEvidenciaWeb(payload) {
  payload = CI_object_(payload);
  var folio = CI_text_(payload.folio) || CI_newFolio_();
  var category = CI_fileName_(payload.categoria || 'EVIDENCIA');
  var originalName = CI_fileName_(payload.nombre || category + '.pdf');
  var mime = CI_text_(payload.mimeType) || MimeType.PDF;
  if (mime !== MimeType.PDF && mime !== 'application/pdf') throw new Error('Solo se aceptan archivos PDF.');
  var bytes = Utilities.base64Decode(CI_text_(payload.base64));
  if (!bytes.length) throw new Error('El PDF está vacío.');
  if (bytes.length > 8 * 1024 * 1024) throw new Error('El PDF supera el límite de 8 MB.');
  var folder = CI_folioFolder_(folio);
  var evidenceFolder = CI_childFolder_(folder, 'EVIDENCIAS');
  var stampedName = category + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + originalName;
  var file = evidenceFolder.createFile(Utilities.newBlob(bytes, MimeType.PDF, stampedName));
  var sh = CI_sheet_(CI_spreadsheet_(), CI_SHEET_ARCHIVOS, [
    'Fecha', 'Folio', 'Categoría', 'Nombre', 'Archivo ID', 'URL', 'Tipo MIME'
  ]);
  sh.appendRow([new Date(), folio, category, stampedName, file.getId(), file.getUrl(), MimeType.PDF]);
  sh.getRange(sh.getLastRow(), 1).setNumberFormat('dd/mm/yyyy hh:mm');
  return {ok: true, folio: folio, fileId: file.getId(), url: file.getUrl(), name: stampedName};
}








/**
 * Devuelve qué documentos de revisión ya están integrados al folio y cuáles faltan.
 * La regla es simple: lo ya recibido NO se vuelve a solicitar.
 */
function CI_estadoDocumentosRevisionWeb(request) {
  request = CI_object_(request);
  var folio = CI_text_(request.folio);
  if (!folio) throw new Error('Falta el folio para revisar documentos.');
  var sh = CI_sheet_(CI_spreadsheet_(), CI_SHEET_ARCHIVOS, [
    'Fecha', 'Folio', 'Categoría', 'Nombre', 'Archivo ID', 'URL', 'Tipo MIME'
  ]);
  var received = {};
  if (sh.getLastRow() >= 2) {
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
    rows.forEach(function (r) {
      if (CI_text_(r[1]) === folio) received[CI_text_(r[2])] = true;
    });
  }
  var documentos = CI_REVIEW_DOCS.map(function (d) {
    return {categoria: d.category, documento: d.label, recibido: Boolean(received[d.category])};
  });
  var faltantes = documentos.filter(function (d) { return !d.recibido; });
  return {
    ok: true,
    folio: folio,
    completos: documentos.length - faltantes.length,
    total: documentos.length,
    documentos: documentos,
    faltantes: faltantes,
    mensaje: faltantes.length ? 'Solicitar únicamente los documentos faltantes.' : 'Documentación mínima para revisión completa.'
  };
}




function CI_generarPropuestaInicialWeb(payload) {
  payload = CI_object_(payload);
  var saved = CI_guardarExpedienteWeb(payload);
  payload.folio = saved.folio;
  var campos = CI_object_(payload.campos);
  var offer = Number(payload.propuestaInicial || 0);
  if (!offer) throw new Error('La propuesta inicial no tiene monto.');
  var clientLinks = CI_clientLinks_(payload.folio);
  var linkCita = clientLinks.cita;
  var linkDocs = clientLinks.documentos;
  if (!linkCita || !linkDocs) throw new Error('Configura CI_PORTAL_URL y CI_PORTAL_SECRET en Script Properties antes de generar los dos QR.');
  var pack = CI_newDocument_('Propuesta inicial ' + payload.folio, payload.folio, 'PROPUESTAS');
  var body = pack.body;
  CI_brand_(body, 'PROPUESTA INICIAL DE COMPRA');
  CI_meta_(body, payload.folio, campos.clienteNombre);
  body.appendParagraph('Vehículo evaluado').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(CI_vehicle_(CI_object_(payload.vehiculo)) || 'Vehículo por confirmar');
  CI_priceBlock_(body, 'PROPUESTA INICIAL', offer);




  // Mensaje comercial opcional; nunca sustituye las condiciones obligatorias.
  if (CI_text_(campos.mensajePropuesta)) {
    CI_formatParagraph_(body.appendParagraph(CI_text_(campos.mensajePropuesta)), {color: '#4B5563', size: 10});
  }




  CI_disclaimerPropuesta_(body, false);
  CI_reviewDocsBlock_(body);




  if (campos.vigenciaPropuesta) CI_formatParagraph_(body.appendParagraph('Vigencia: ' + CI_text_(campos.vigenciaPropuesta)), {bold: true});
  body.appendParagraph('Siguiente paso').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('1) Envía la documentación mínima en PDF. 2) Agenda la cita para la revisión física del vehículo. La cita puede confirmarse aunque todavía exista algún documento pendiente.');




  // SOLO DOS QR en la propuesta inicial: documentos + cita/revisión.
  CI_qrPair_(body, linkDocs, linkCita);
  CI_clientFooter_(body);
  return CI_finishPdf_(pack, 'Propuesta_Inicial_' + payload.folio + '.pdf');
}




function CI_generarPropuestaFinalWeb(payload) {
  payload = CI_object_(payload);
  var campos = CI_object_(payload.campos);
  if (campos.autDecision !== 'Autorizada') throw new Error('La propuesta final requiere autorización humana.');
  if (!CI_text_(campos.autNombre)) throw new Error('Falta el nombre de quien autoriza.');
  if (!['confirmDocs','confirmReportes','confirmFisica','confirmMecanica'].every(function(k){return campos[k] === true;})) throw new Error('Faltan las cuatro confirmaciones de la revisión.');
  if (Number(campos.autTope || 0) > 0 && Number(payload.propuestaFinal || campos.propuestaFinalManual || 0) > Number(campos.autTope)) throw new Error('La oferta supera el tope autorizado.');
  var finalPrice = Number(payload.propuestaFinal || campos.propuestaFinalManual || 0);
  if (!finalPrice) throw new Error('La propuesta final no tiene monto.');
  var saved = CI_guardarExpedienteWeb(payload);
  payload.folio = saved.folio;
  var pack = CI_newDocument_('Propuesta final ' + payload.folio, payload.folio, 'PROPUESTAS');
  var body = pack.body;
  CI_brand_(body, 'PROPUESTA FINAL DE COMPRA');
  CI_meta_(body, payload.folio, campos.clienteNombre);
  body.appendParagraph('Vehículo').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(CI_vehicle_(CI_object_(payload.vehiculo)) || 'Vehículo identificado en el expediente');
  CI_priceBlock_(body, 'OFERTA FINAL CLASA®', finalPrice);
  CI_disclaimerPropuesta_(body, true);
  body.appendParagraph('Documentación para cierre').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Si la operación continúa, Automotriz CLASA® solicitará únicamente la documentación que todavía falte en el expediente. Los documentos restantes deberán enviarse en PDF el día de la compra. No se volverá a pedir lo que ya fue recibido.');
  if (campos.vigenciaPropuesta) CI_formatParagraph_(body.appendParagraph('Vigencia: ' + CI_text_(campos.vigenciaPropuesta)), {bold: true});
  CI_clientFooter_(body);
  return CI_finishPdf_(pack, 'Propuesta_Final_' + payload.folio + '.pdf');
}




function CI_generarChecklistInternoWeb(payload) {
  payload = CI_object_(payload);
  var saved = CI_guardarExpedienteWeb(payload);
  payload.folio = saved.folio;
  var c = CI_object_(payload.campos);
  var pack = CI_newDocument_('Checklist interno ' + payload.folio, payload.folio, 'REVISION_INTERNA');
  var body = pack.body;
  CI_brand_(body, 'CHECKLIST FINAL Y GASTOS — USO INTERNO');
  CI_meta_(body, payload.folio, c.clienteNombre);
  CI_table_(body, 'Identificación y placas', [
    ['NIV documental', c.vinDocumental], ['NIV físico', c.vinFisico], ['Coincidencia NIV', c.vinCoincide],
    ['Motor documental', c.motorDocumental], ['Motor físico', c.motorFisico], ['Coincidencia motor', c.motorCoincide],
    ['Placa', c.placaNumero], ['Estado', c.placaEstado], ['Baja de placas', c.bajaStatus]
  ]);
  CI_table_(body, 'Accesorios recibidos', [
    ['Llanta de refacción', c.accRefaccion], ['Birlo de seguridad', c.accBirlo],
    ['Cables de carga / corriente', c.accCables], ['Llave de llantas', c.accLlaveLlantas],
    ['Tapetes', c.accTapetes], ['Llaves del vehículo', c.accLlaves], ['Observaciones', c.accObservaciones]
  ]);
  CI_table_(body, 'Revisión y gastos', [
    ['Resultado mecánico', c.mecResultado], ['Condición de batería', c.bateriaCondicion],
    ['Mecánica', CI_currency_(c.gastoMecanica)], ['Batería', CI_currency_(c.gastoBateria)],
    ['Hojalatería y pintura', CI_currency_(c.gastoHojalateria)], ['Acondicionamiento', CI_currency_(c.gastoAcondicionamiento)],
    ['Accesorios faltantes', CI_currency_(c.gastoAccesorios)], ['Adeudos', CI_currency_(c.gastoAdeudos)],
    ['Baja / gestión', CI_currency_(c.gastoBaja)], ['Observaciones', c.gastosObservaciones]
  ]);
  CI_table_(body, 'Reportes internos', [
    ['REPUVE', CI_reportValue_(payload, 'REPUVE')], ['RAPI / Fiscalía', CI_reportValue_(payload, 'RAPI')],
    ['Adeudos', CI_reportValue_(payload, 'ADEUDOS')], ['SAT / Factura', CI_reportValue_(payload, 'SAT')],
    ['TransUnion', CI_reportValue_(payload, 'TRANSUNION')]
  ]);
  body.appendParagraph('Observaciones físicas').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(CI_text_(c.fisObservaciones) || 'Sin observaciones registradas.');
  body.appendParagraph('Observaciones mecánicas').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(CI_text_(c.mecObservaciones) || 'Sin observaciones registradas.');
  CI_formatParagraph_(body.appendParagraph('Documento de uso interno. No entregar al cliente.'), {bold: true, color: '#E30613'});
  return CI_finishPdf_(pack, 'Checklist_Interno_' + payload.folio + '.pdf');
}








function CI_finalizarCompraWeb(payload) {
  payload = CI_object_(payload);
  var c = CI_object_(payload.campos);
  if (!CI_text_(payload.folio)) throw new Error('Guarda primero el expediente y asigna un folio.');
  CI_obtenerExpedienteWeb({folio:payload.folio});
  if (c.respuestaFinal !== 'Aceptada' || c.pagoStatus !== 'Pagado' || c.recUnidad !== true || c.recDocumentos !== true) throw new Error('Falta aceptación, pago o recepción de unidad y documentos.');
  if (c.autDecision !== 'Autorizada' || !CI_text_(c.autNombre)) throw new Error('Falta la autorización humana de compra.');
  if (!CI_text_(c.vinFisico)) throw new Error('Captura la Serie / VIN físico antes de finalizar.');
  if (!CI_text_(c.motorFisico) && !CI_text_(c.motorLeyenda)) throw new Error('Captura el número de motor o una leyenda explícita.');
  c.inventarioEstatus = 'Recibido';
  payload.campos = c;
  payload.modulo = 6;
  var sync = CI_sincronizarInventario_(payload, false);
  if (!sync || !sync.ok) throw new Error('No se confirmó el alta en INVENTARIO.');
  var saved = CI_guardarExpedienteWeb(payload);
  return {ok:true, folio:saved.folio, inventario:sync};
}




function CI_aprobarEstrategiaVentaWeb(payload) {
  payload = CI_object_(payload);
  var c = CI_object_(payload.campos);
  var compra = Number(c.ventaCostoCompra || c.montoAcordado || payload.propuestaFinal || 0);
  var gastos = Number(c.ventaGastosReales || 0);
  var utilidadMin = Number(c.ventaUtilidadMinima || 0);
  var costoTotal = compra + gastos;
  var piso = costoTotal + utilidadMin;
  var precio = Number(c.ventaPrecioAprobado || 0);
  if (!precio) throw new Error('Falta el precio de venta aprobado.');
  if (precio < piso) throw new Error('El precio aprobado está debajo del precio piso protegido.');
  if (!CI_text_(c.ventaAutoriza)) throw new Error('Falta el responsable que autoriza el precio.');
  payload.modulo = 7;
  CI_guardarExpedienteWeb(payload);
  var sync = CI_sincronizarInventario_(payload, true);
  return {ok:true, precioAprobado:precio, precioPiso:piso, inventario:sync};
}




function CI_listarAlertasInventarioWeb() {
  var sh = CI_inventorySheet_();
  var last = sh.getLastRow();
  if (last <= CI_INVENTORY_HEADER_ROW) return [];
  var width = Math.max(30, sh.getLastColumn());
  var headers = sh.getRange(CI_INVENTORY_HEADER_ROW,1,1,width).getDisplayValues()[0];
  var rows = sh.getRange(CI_INVENTORY_HEADER_ROW+1,1,last-CI_INVENTORY_HEADER_ROW,width).getValues();
  var map = CI_headerMap_(headers);
  var now = new Date();
  return rows.map(function(r){
    var veh = CI_valByHeader_(r,map,'Vehículo') || [CI_valByHeader_(r,map,'Marca'),CI_valByHeader_(r,map,'Modelo'),CI_valByHeader_(r,map,'Año')].filter(String).join(' ');
    if (!veh) return null;
    var rawDate = CI_valByHeader_(r,map,'Fecha Alta');
    var d = CI_date_(rawDate);
    var days = d ? Math.max(0, Math.floor((now.getTime()-d.getTime())/86400000)) : null;
    var months = days === null ? null : Math.floor(days/30);
    var current = Number(CI_valByHeader_(r,map,'Precio Venta') || 0);
    return {
      folio: CI_text_(CI_valByHeader_(r,map,'Folio Unidad')),
      vehiculo: CI_text_(veh),
      fechaAlta: d ? Utilities.formatDate(d,Session.getScriptTimeZone(),'dd/MM/yyyy') : 'Sin fecha',
      dias: days,
      meses: months,
      antiguedad: days === null ? 'Completar fecha de alta' : days+' días · '+(months===1?'1 mes':months+' meses'),
      precioVenta: current,
      estado: CI_text_(CI_valByHeader_(r,map,'Estado Comercial') || CI_valByHeader_(r,map,'Estado Operativo')),
      estrategia: CI_strategyByMonths_(months,current)
    };
  }).filter(Boolean).sort(function(a,b){return (b.dias===null?-1:b.dias)-(a.dias===null?-1:a.dias);});
}




function CI_sincronizarInventario_(payload, forcePrice) {
  payload = CI_object_(payload);
  var c = CI_object_(payload.campos), v = CI_object_(payload.vehiculo);
  var sh = CI_inventorySheet_();
  var width = Math.max(30,sh.getLastColumn());
  var headers = sh.getRange(CI_INVENTORY_HEADER_ROW,1,1,width).getDisplayValues()[0];
  var map = CI_headerMap_(headers);
  if (!map['Folio Unidad'] || !map['Fecha Alta'] || !map['Serie / VIN'] || !map['Motor / Leyenda'] || !map['Marca'] || !map['Modelo']) throw new Error('INVENTARIO no tiene los encabezados requeridos en la fila 4.');
  var folio = CI_text_(c.inventarioClave) || CI_text_(payload.folio);
  if (!folio) throw new Error('No hay folio para sincronizar con INVENTARIO.');
  var row = CI_findInventoryRow_(sh,map,folio);
  var requestedRow = Number(c.inventarioFilaExistente || 0);
  var brand = CI_pickVehicle_(v,'marca','marcaManual').toLowerCase();
  var model = CI_pickVehicle_(v,'modelo','modeloManual').toLowerCase();
  var year = CI_text_(v.anio);
  if (requestedRow) {
    if (!Number.isInteger(requestedRow) || requestedRow <= CI_INVENTORY_HEADER_ROW || requestedRow > sh.getLastRow()) throw new Error('La fila de INVENTARIO no es válida.');
    if (row && row !== requestedRow) throw new Error('El folio ya está ligado a otra fila de INVENTARIO.');
    var prior = sh.getRange(requestedRow,1,1,width).getDisplayValues()[0];
    var priorFolio = CI_text_(CI_valByHeader_(prior,map,'Folio Unidad'));
    if (priorFolio && priorFolio !== folio) throw new Error('La fila indicada ya pertenece a otro folio.');
    if (CI_text_(CI_valByHeader_(prior,map,'Marca')).toLowerCase() !== brand || CI_text_(CI_valByHeader_(prior,map,'Modelo')).toLowerCase() !== model || CI_text_(CI_valByHeader_(prior,map,'Año')) !== year) throw new Error('La fila indicada no coincide con marca, modelo y año del expediente.');
    var priorVin = CI_text_(CI_valByHeader_(prior,map,'Serie / VIN'));
    if (priorVin && priorVin.toUpperCase() !== CI_text_(c.vinFisico).toUpperCase()) throw new Error('El VIN de la fila existente no coincide.');
    row = requestedRow;
  }
  var vin = CI_text_(c.vinFisico).toUpperCase();
  if (vin && sh.getLastRow() > CI_INVENTORY_HEADER_ROW) {
    var storedVins = sh.getRange(CI_INVENTORY_HEADER_ROW+1, map['Serie / VIN'],
      sh.getLastRow()-CI_INVENTORY_HEADER_ROW, 1).getDisplayValues();
    var matchingRows = [];
    storedVins.forEach(function(r,i) {
      if (CI_text_(r[0]).toUpperCase() === vin) matchingRows.push(CI_INVENTORY_HEADER_ROW+1+i);
    });
    if (matchingRows.length > 1) throw new Error('El VIN ya aparece en varias filas de INVENTARIO: '+matchingRows.join(', ')+'. Revisa el inventario antes del cierre.');
    if (matchingRows.length && matchingRows[0] !== row) {
      throw new Error('El VIN ya está en INVENTARIO, fila '+matchingRows[0]+'. Vincula esa fila y conserva su folio de unidad.');
    }
  }
  if (!row && sh.getLastRow() > CI_INVENTORY_HEADER_ROW && c.inventarioNuevaUnidad !== true) {
    var currentRows = sh.getRange(CI_INVENTORY_HEADER_ROW+1,1,sh.getLastRow()-CI_INVENTORY_HEADER_ROW,width).getDisplayValues();
    var possible = [];
    currentRows.forEach(function(r,i){
      if (!CI_text_(CI_valByHeader_(r,map,'Folio Unidad')) &&
          CI_text_(CI_valByHeader_(r,map,'Marca')).toLowerCase() === brand &&
          CI_text_(CI_valByHeader_(r,map,'Modelo')).toLowerCase() === model &&
          CI_text_(CI_valByHeader_(r,map,'Año')) === year) possible.push(CI_INVENTORY_HEADER_ROW+1+i);
    });
    if (possible.length) throw new Error('Posible unidad existente en INVENTARIO, fila(s) '+possible.join(', ')+'. Indica la fila correcta o marca que es una unidad nueva distinta.');
  }
  if (row && CI_text_(c.inventarioClave) && CI_text_(c.inventarioClave) !== CI_text_(payload.folio)) {
    var marcaExistente = CI_text_(sh.getRange(row,map['Marca']).getDisplayValue());
    var modeloExistente = CI_text_(sh.getRange(row,map['Modelo']).getDisplayValue());
    if ((marcaExistente && marcaExistente.toLowerCase() !== CI_pickVehicle_(v,'marca','marcaManual').toLowerCase()) || (modeloExistente && modeloExistente.toLowerCase() !== CI_pickVehicle_(v,'modelo','modeloManual').toLowerCase())) throw new Error('La clave existente corresponde a otro vehículo. Revisa el folio de inventario.');
  }
  if (!row) row = sh.getLastRow()+1;
  var fecha = CI_date_(c.inventarioFecha) || new Date();
  var vehicle = CI_vehicle_(v);
  var source = CI_text_(c.cierreOperacion)==='Toma a cuenta' ? 'TOMA A CUENTA' : 'COMPRA';
  var updates = {
    'Folio Unidad': folio,
    'Fecha Alta': fecha,
    'Origen Unidad': source,
    'Serie / VIN': CI_text_(c.vinFisico),
    'Motor / Leyenda': CI_text_(c.motorFisico) || CI_text_(c.motorLeyenda),
    'Marca': CI_pickVehicle_(v,'marca','marcaManual'),
    'Modelo': CI_pickVehicle_(v,'modelo','modeloManual'),
    'Año': Number(v.anio||0)||'',
    'Versión': CI_pickVehicle_(v,'version','versionManual'),
    'Vehículo': vehicle,
    'Kilometraje': Number(v.km||0)||'',
    'Tipo de factura': CI_text_(v.factura),
    'Transmisión': CI_text_(v.transmision),
    'Combustible': CI_text_(v.combustible),
    'Color': CI_text_(v.color),
    'Estado Comercial': c.ventaPublicacionStatus==='Publicado' ? 'DISPONIBLE' : 'PENDIENTE DE PUBLICACIÓN',
    'Estado Operativo': CI_text_(c.inventarioEstatus) || 'EN LOTE',
    'Última Actualización': new Date()
  };
  var approved = Number(c.ventaPrecioAprobado || 0);
  if (forcePrice || approved) updates['Precio Venta'] = approved || Number(c.ventaPrecioActual||0) || '';
  var total = Number(c.ventaCostoCompra||c.montoAcordado||payload.propuestaFinal||0)+Number(c.ventaGastosReales||0);
  var floor = total+Number(c.ventaUtilidadMinima||0);
  if (approved || Number(payload.modulo)>=7) {
    updates['Observaciones'] = 'Estrategia Inteligente de Venta | Costo total '+CI_currency_(total)+' | Piso protegido '+CI_currency_(floor)+' | Precio aprobado '+CI_currency_(approved)+' | Autoriza '+CI_text_(c.ventaAutoriza)+' | Revisión '+CI_text_(c.ventaFechaRevision||'')+'. '+CI_text_(c.ventaObservaciones);
  } else if (CI_text_(c.inventarioObservaciones)) updates['Observaciones'] = CI_text_(c.inventarioObservaciones);
  Object.keys(updates).forEach(function(name){var col=map[name];if(col)sh.getRange(row,col).setValue(updates[name]);});
  if (map['Fecha Alta']) sh.getRange(row,map['Fecha Alta']).setNumberFormat('dd/mm/yyyy');
  if (map['Precio Venta']) sh.getRange(row,map['Precio Venta']).setNumberFormat('$#,##0');
  return {ok:true,row:row,folio:folio,precioVenta:approved||0};
}




function CI_inventorySheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('CI_INVENTORY_SPREADSHEET_ID') || CI_INVENTORY_SPREADSHEET_ID;
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(CI_INVENTORY_SHEET);
  if (!sh) throw new Error('No se encontró la pestaña INVENTARIO.');
  return sh;
}
function CI_headerMap_(headers){var out={};headers.forEach(function(h,i){if(CI_text_(h))out[CI_text_(h)]=i+1;});return out;}
function CI_valByHeader_(row,map,name){var c=map[name];return c?row[c-1]:'';}
function CI_findInventoryRow_(sh,map,folio){var col=map['Folio Unidad'];if(!col||sh.getLastRow()<=CI_INVENTORY_HEADER_ROW)return 0;var f=sh.getRange(CI_INVENTORY_HEADER_ROW+1,col,sh.getLastRow()-CI_INVENTORY_HEADER_ROW,1).createTextFinder(folio).matchEntireCell(true).findNext();return f?f.getRow():0;}
function CI_date_(v){if(!v)return null;if(v instanceof Date&&!isNaN(v.getTime()))return v;var d=new Date(v);return isNaN(d.getTime())?null:d;}
function CI_pickVehicle_(v,a,b){var x=CI_text_(v[a]);return /otr[ao]/i.test(x)&&CI_text_(v[b])?CI_text_(v[b]):x;}
function CI_strategyByMonths_(months,current){
  if(months===null)return 'Completar fecha de alta para activar alertas.';
  if(months<=0)return 'Mantener precio y medir respuesta.';
  if(months===1)return 'Actualizar mercado y revisar primer ajuste sin comprometer utilidad.';
  if(months===2)return 'Recalcular mercado, campaña y financiamiento; ajustar dentro del margen.';
  if(months===3)return 'Prioridad: acercar al mercado sin romper el piso protegido.';
  if(months===4)return 'Revisión gerencial: piso, mayoreo, intercambio o promoción especial.';
  return 'Inventario crítico: salida gerencial; no bajar automáticamente por debajo del piso.';
}




function CI_spreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('CI_SPREADSHEET_ID') || CI_DEFAULT_SPREADSHEET_ID;
  if (!id) throw new Error('Configura CI_SPREADSHEET_ID en las propiedades del proyecto.');
  return SpreadsheetApp.openById(id);
}




function CI_sheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && headers.length && sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#101820').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}




function CI_rootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CI_ROOT_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) { props.deleteProperty('CI_ROOT_FOLDER_ID'); }
  }
  var matches = DriveApp.getFoldersByName(CI_ROOT_FOLDER_NAME);
  var folder = matches.hasNext() ? matches.next() : DriveApp.createFolder(CI_ROOT_FOLDER_NAME);
  props.setProperty('CI_ROOT_FOLDER_ID', folder.getId());
  return folder;
}




function CI_folioFolder_(folio) {
  return CI_childFolder_(CI_rootFolder_(), CI_fileName_(folio));
}




function CI_childFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}




function CI_findRow_(sheet, folio) {
  if (sheet.getLastRow() < 2) return 0;
  var found = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(folio).matchEntireCell(true).findNext();
  return found ? found.getRow() : 0;
}




function CI_newFolio_() {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  var random = Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase();
  return 'CIA-' + stamp + '-' + random;
}




function CI_status_(payload) {
  var c = CI_object_(payload.campos);
  if (Number(payload.modulo) >= 7 && c.ventaPublicacionStatus && c.ventaPublicacionStatus !== 'Pendiente') return 'Estrategia de venta';
  if (Number(payload.modulo) >= 6 && c.inventarioEstatus && c.inventarioEstatus !== 'Pendiente') return 'Inventario';
  if (Number(payload.modulo) >= 5 && c.respuestaFinal === 'Aceptada') return 'Cierre';
  if (c.autDecision === 'Autorizada') return 'Autorizada';
  if (c.autDecision === 'Rechazada') return 'Rechazada';
  if (Number(payload.modulo) >= 3) return 'En revisión';
  if (Number(payload.modulo) >= 2) return 'Expediente';
  return 'Valuación';
}




function CI_jsonForCell_(payload) {
  var json = JSON.stringify(payload);
  if (json.length <= 45000) return json;
  var copy = JSON.parse(JSON.stringify(payload));
  if (copy.resultado) {
    delete copy.resultado.comparables;
    delete copy.resultado.analisis_ia;
    delete copy.resultado.resumen_final;
  }
  json = JSON.stringify(copy);
  if (json.length > 45000) json = JSON.stringify({
    folio: copy.folio,
    modulo: copy.modulo,
    etapa: copy.etapa,
    propuestaInicial: copy.propuestaInicial,
    propuestaFinal: copy.propuestaFinal,
    vehiculo: copy.vehiculo,
    campos: copy.campos
  });
  return json.slice(0, 49000);
}




function CI_newDocument_(name, folio, subfolder) {
  var folder = CI_childFolder_(CI_folioFolder_(folio), subfolder);
  var doc = DocumentApp.create(name);
  var file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  var body = doc.getBody();
  body.clear();
  body.setMarginTop(38).setMarginBottom(38).setMarginLeft(44).setMarginRight(44);
  return {doc: doc, body: body, folder: folder};
}




function CI_brand_(body, title) {
  var logoId = PropertiesService.getScriptProperties().getProperty('CI_LOGO_FILE_ID');
  if (logoId) {
    try {
      var image = body.appendImage(DriveApp.getFileById(logoId).getBlob());
      var width = image.getWidth();
      if (width > 190) image.setWidth(190).setHeight(Math.round(image.getHeight() * 190 / width));
    } catch (err) {}
  }
  var brand = body.appendParagraph('AUTOMOTRIZ CLASA®');
  CI_formatParagraph_(brand, {bold: true, size: 18, color: '#101820'});
  var heading = body.appendParagraph(title);
  CI_formatParagraph_(heading, {bold: true, size: 22, color: '#E30613', after: 12});
  body.appendHorizontalRule();
}




function CI_meta_(body, folio, client) {
  var table = body.appendTable([
    ['Folio', CI_text_(folio)],
    ['Fecha', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy')],
    ['Cliente', CI_text_(client) || 'Por confirmar']
  ]);
  table.setBorderColor('#D9DEE4').setBorderWidth(1);
  table.getColumnWidth(0);
  for (var i = 0; i < table.getNumRows(); i++) {
    table.getRow(i).getCell(0).setBackgroundColor('#F1F3F5').editAsText().setBold(true);
  }
  body.appendParagraph('');
}




function CI_priceBlock_(body, label, value) {
  var p = body.appendParagraph(label + '\n' + CI_currency_(value));
  CI_formatParagraph_(p, {align: DocumentApp.HorizontalAlignment.CENTER, background: '#E8F5EA', color: '#087333', bold: true, size: 18, before: 12, after: 12});
}




function CI_linkButton_(body, label, url) {
  if (!url) return;
  var p = body.appendParagraph(label);
  CI_formatParagraph_(p, {align: DocumentApp.HorizontalAlignment.CENTER, background: '#E30613', color: '#FFFFFF', bold: true, size: 12, before: 7, after: 7, link: url});
}




function CI_disclaimerPropuesta_(body, esFinal) {
  var heading = body.appendParagraph('IMPORTANTE SOBRE ESTA PROPUESTA');
  CI_formatParagraph_(heading, {bold: true, size: 12, color: '#E30613', before: 12, after: 5});




  if (!esFinal) {
    body.appendParagraph('El monto indicado corresponde a una propuesta inicial elaborada con base en la información proporcionada por el cliente. La propuesta definitiva estará sujeta a la revisión física, mecánica, estética y documental del vehículo, por lo que el valor podrá mantenerse, mejorar o ajustarse de acuerdo con las condiciones reales encontradas durante la inspección.');
  } else {
    body.appendParagraph('El monto indicado corresponde a la propuesta final autorizada con base en la revisión y la información disponible en el expediente. La operación se formaliza únicamente cuando el cliente acepta la propuesta y se completan la entrega de la unidad, la documentación y los comprobantes correspondientes.');
  }




  body.appendParagraph('En la revisión se consideran, entre otros puntos: condiciones mecánicas; motor, transmisión y suspensión; golpes o reparaciones previas; hojalatería y pintura; interiores y vestiduras; llantas y batería; aire acondicionado, sistemas eléctricos y accesorios; testigos o fallas; documentación y antecedentes; adeudos o trámites pendientes; llaves, accesorios y gastos necesarios para acondicionar el vehículo.');




  if (!esFinal) {
    body.appendParagraph('Si el vehículo se encuentra en mejores condiciones de lo esperado y prácticamente no requiere inversión, la propuesta podría mejorar. Si se detectan fallas, daños, detalles estéticos, gastos mecánicos o situaciones documentales, la propuesta final podría ajustarse.');
  }




  CI_formatParagraph_(body.appendParagraph('Si después de conocer la propuesta final el cliente considera que no le conviene realizar la operación, no existe obligación de aceptarla y podrá retirar su vehículo sin problema.'), {bold: true, color: '#101820'});
}




function CI_reviewDocsBlock_(body) {
  var heading = body.appendParagraph('DOCUMENTOS PARA LA REVISIÓN DEL VEHÍCULO');
  CI_formatParagraph_(heading, {bold: true, size: 12, color: '#101820', before: 12, after: 4});
  body.appendParagraph('Para iniciar la revisión documental, envía únicamente los siguientes documentos en formato PDF:');
  CI_REVIEW_DOCS.forEach(function (d) {
    CI_formatParagraph_(body.appendParagraph('• ' + d.label), {size: 10, color: '#374151'});
  });
  CI_formatParagraph_(body.appendParagraph('Si Automotriz CLASA® decide comprar el vehículo, solo se solicitará la documentación faltante. El día de la compra, los documentos restantes también deberán enviarse en PDF.'), {bold: true, size: 9, color: '#4B5563', after: 8});
}




function CI_qrPair_(body, linkDocs, linkCita) {
  var heading = body.appendParagraph('CONTINÚA TU PROCESO');
  CI_formatParagraph_(heading, {bold: true, size: 12, color: '#101820', before: 12, after: 5});
  var table = body.appendTable([['', '']]);
  try { table.setBorderWidth(0); } catch (e) { try { table.setBorderColor('#FFFFFF'); } catch (err2) {} }
  var cells = [
    {cell: table.getRow(0).getCell(0), label: 'ENVIAR DOCUMENTOS', url: linkDocs, note: 'Documentación para revisión · PDF'},
    {cell: table.getRow(0).getCell(1), label: 'AGENDAR CITA / REVISIÓN', url: linkCita, note: 'Programa la revisión del vehículo'}
  ];
  cells.forEach(function (item) {
    var title = item.cell.appendParagraph(item.label);
    CI_formatParagraph_(title, {align: DocumentApp.HorizontalAlignment.CENTER, bold: true, color: '#E30613', size: 10});
    var img = item.cell.appendImage(CI_qrBlob_(item.url));
    img.setWidth(125).setHeight(125);
    CI_formatParagraph_(item.cell.appendParagraph(item.note), {align: DocumentApp.HorizontalAlignment.CENTER, size: 8, color: '#6B7280'});
    var link = item.cell.appendParagraph('Abrir enlace');
    CI_formatParagraph_(link, {align: DocumentApp.HorizontalAlignment.CENTER, size: 8, color: '#374151', link: item.url});
  });
  body.appendParagraph('');
}




function CI_clientLinks_(folio) {
  var props = PropertiesService.getScriptProperties();
  var base = CI_httpUrl_(props.getProperty('CI_PORTAL_URL'));
  var secret = CI_text_(props.getProperty('CI_PORTAL_SECRET'));
  if (!base || !secret || !folio) return {documentos:'', cita:''};
  var token = CI_clientToken_(folio, secret);
  var joiner = base.indexOf('?') >= 0 ? '&' : '?';
  var common = joiner + 'folio=' + encodeURIComponent(folio) + '&token=' + encodeURIComponent(token);
  return {
    documentos: base + common + '&accion=documentos',
    cita: base + common + '&accion=cita'
  };
}




function CI_clientToken_(folio, secret) {
  var sig = Utilities.computeHmacSha256Signature(String(folio), String(secret));
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/,'').slice(0,32);
}




function CI_qrBlob_(url) {
  if (typeof qrcode !== 'function') throw new Error('Instala QRCodeLocal.gs antes de generar los QR.');
  var qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  var dataUrl = qr.createDataURL(4, 4);
  var prefix = 'data:image/gif;base64,';
  if (dataUrl.slice(0, prefix.length) !== prefix) throw new Error('No fue posible crear el QR local.');
  return Utilities.newBlob(Utilities.base64Decode(dataUrl.slice(prefix.length)), 'image/gif', 'QR_CLASA.gif');
}




function CI_clientFooter_(body) {
  CI_formatParagraph_(body.appendParagraph('AUTOMOTRIZ CLASA® · TU CONFIANZA NOS MUEVE'), {align: DocumentApp.HorizontalAlignment.CENTER, bold: true, color: '#101820', before: 18});
  CI_formatParagraph_(body.appendParagraph('Documento comercial. La operación se formaliza mediante los contratos y comprobantes correspondientes.'), {align: DocumentApp.HorizontalAlignment.CENTER, size: 8, color: '#6B7280'});
}




function CI_table_(body, title, rows) {
  var heading = body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  CI_formatParagraph_(heading, {color: '#101820'});
  var clean = rows.map(function (r) { return [CI_text_(r[0]), CI_text_(r[1]) || 'Pendiente']; });
  var table = body.appendTable(clean);
  table.setBorderColor('#D9DEE4').setBorderWidth(1);
  for (var i = 0; i < table.getNumRows(); i++) table.getRow(i).getCell(0).setBackgroundColor('#F1F3F5').editAsText().setBold(true);
  body.appendParagraph('');
}




function CI_formatParagraph_(paragraph, style) {
  style = style || {};
  if (style.align) paragraph.setAlignment(style.align);
  if (style.before !== undefined) paragraph.setSpacingBefore(Number(style.before));
  if (style.after !== undefined) paragraph.setSpacingAfter(Number(style.after));
  if (style.background) {
    var attrs = {};
    attrs[DocumentApp.Attribute.BACKGROUND_COLOR] = style.background;
    paragraph.setAttributes(attrs);
  }
  var text = paragraph.editAsText();
  if (style.bold !== undefined) text.setBold(Boolean(style.bold));
  if (style.size !== undefined) text.setFontSize(Number(style.size));
  if (style.color) text.setForegroundColor(style.color);
  if (style.link) text.setLinkUrl(style.link).setUnderline(false);
  return paragraph;
}




function CI_finishPdf_(pack, pdfName) {
  pack.doc.saveAndClose();
  var source = DriveApp.getFileById(pack.doc.getId());
  var pdf = pack.folder.createFile(source.getAs(MimeType.PDF).setName(pdfName));
  return {ok: true, fileId: pdf.getId(), url: pdf.getUrl(), name: pdf.getName(), sourceDocUrl: source.getUrl()};
}




function CI_reportValue_(payload, name) {
  var reports = CI_object_(payload.reportes);
  var fields = CI_object_(payload.campos);
  var map = {REPUVE: 'reportRepuve', RAPI: 'reportRapi', ADEUDOS: 'reportAdeudos', SAT: 'reportSat', TRANSUNION: 'reportTransUnion'};
  return CI_text_(reports[name]) || CI_text_(fields[map[name]]) || 'Consultar PDF del expediente';
}




function CI_vehicle_(vehicle) {
  vehicle = CI_object_(vehicle);
  function pick(normal, manual) {
    var value = CI_text_(normal);
    return /otr[ao]/i.test(value) && CI_text_(manual) ? CI_text_(manual) : value;
  }
  return [pick(vehicle.marca, vehicle.marcaManual), pick(vehicle.modelo, vehicle.modeloManual), pick(vehicle.version, vehicle.versionManual), CI_text_(vehicle.anio)].filter(String).join(' ');
}




function CI_httpUrl_(value) {
  var text = CI_text_(value);
  return /^https?:\/\//i.test(text) ? text : '';
}




function CI_currency_(value) {
  var number = Number(value || 0);
  return '$' + Utilities.formatString('%,.0f', number) + ' MXN';
}




function CI_fileName_(value) {
  return CI_text_(value).replace(/[\\/:*?"<>|#%{}\[\]]/g, '_').replace(/\s+/g, '_').slice(0, 150) || 'ARCHIVO';
}




function CI_dateLabel_(value) {
  if (!value) return '';
  var date = value instanceof Date ? value : new Date(value);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}




function CI_object_(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}




function CI_text_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}