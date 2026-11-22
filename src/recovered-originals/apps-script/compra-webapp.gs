/**
 * COTIZADOR INTELIGENTE CLASA® — WEB V1
 * Proyecto SOAC® | By Esau Páez | Apoyado por OpenAI
 *
 * REQUIERE:
 * - CLASA_v6.gs ya instalado en el mismo proyecto.
 * - OPENAI_API_KEY guardada en Script Properties.
 *
 * Esta capa WEB:
 * - NO expone la API key al navegador.
 * - Usa el mismo catálogo, reglas CLASA®, búsqueda web e IA del cotizador v6.
 * - Guarda automáticamente cada cotización exitosa.
 * - Conserva comparables por folio.
 */


const CLASA_WEB = {
  SPREADSHEET_ID: '1DKC-bRZOQuvqZjfe9i5APgMfVyvDtKYJgxf2F1-SPx8',
  TITULO: 'Compra Inteligente Automotriz CLASA®',
  SHEET_CATALOGO: 'Catalogo',
  SHEET_HISTORIAL_COMPARABLES: 'Historial Comparables'
};


function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  t.logoBase64 = typeof CLASA_LOGO_B64 !== 'undefined' ? CLASA_LOGO_B64 : '';
  return t.evaluate()
    .setTitle(CLASA_WEB.TITULO)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}


/**
 * Carga catálogos y opciones iniciales para la interfaz.
 */
function obtenerConfiguracionWeb() {
  const ss = SpreadsheetApp.openById(CLASA_WEB.SPREADSHEET_ID);
  const cat = ss.getSheetByName(CLASA_WEB.SHEET_CATALOGO);
  const cot = ss.getSheetByName(CLASA.COTIZADOR);


  if (!cat || !cot) throw new Error('No se encontró Catalogo o Cotizador.');


  const vals = cat.getDataRange().getDisplayValues();
  const catalogo = {};


  for (let i = 1; i < vals.length; i++) {
    const marca = String(vals[i][0] || '').trim();
    const modelo = String(vals[i][1] || '').trim();
    const version = String(vals[i][2] || '').trim();
    if (!marca || !modelo) continue;


    if (!catalogo[marca]) catalogo[marca] = {};
    if (!catalogo[marca][modelo]) catalogo[marca][modelo] = [];
    if (version && catalogo[marca][modelo].indexOf(version) === -1) {
      catalogo[marca][modelo].push(version);
    }
  }


  Object.keys(catalogo).forEach(marca => {
    if (!catalogo[marca]['OTRO / NO LISTADO']) {
      catalogo[marca]['OTRO / NO LISTADO'] = ['OTRA / NO LISTADA'];
    }
    Object.keys(catalogo[marca]).forEach(modelo => {
      const arr = catalogo[marca][modelo];
      if (arr.indexOf('OTRA / NO LISTADA') === -1) arr.push('OTRA / NO LISTADA');
    });
  });


  if (!catalogo['OTRA / NO LISTADA']) {
    catalogo['OTRA / NO LISTADA'] = {
      'OTRO / NO LISTADO': ['OTRA / NO LISTADA']
    };
  }


  const responsables = cot.getRange('AF2:AF20').getDisplayValues().flat().filter(Boolean);
  const operaciones = cot.getRange('AG2:AG20').getDisplayValues().flat().filter(Boolean);


  const anioActual = new Date().getFullYear();
  const anios = [];
  for (let y = anioActual; y >= 1990; y--) anios.push(y);


  return {
    catalogo,
    responsables: [...new Set(responsables.length ? responsables : ['Esau', 'Yanelli', 'Vianey'])],
    operaciones: [...new Set(operaciones.length ? operaciones : ['Solo Venta', 'Toma a cuenta'])],
    facturas: ['Factura de agencia', 'Factura de empresa'],
    anios,
    firma: 'PROYECTO SOAC® • BY ESAU PÁEZ • APOYADO POR OPENAI',
    lema: 'SEGUIMOS CREANDO PARA MEJORAR'
  };
}


/**
 * Cotización WEB principal.
 * La cotización solo se guarda si termina correctamente.
 */
function cotizarDesdeWeb(datos) {
  const inicio = new Date();
  validarDatosWeb_(datos);


  const ss = SpreadsheetApp.openById(CLASA_WEB.SPREADSHEET_ID);
  const sh = ss.getSheetByName(CLASA.COTIZADOR);
  const params = ss.getSheetByName(CLASA.PARAMETROS);
  if (!sh || !params) throw new Error('No se encontró Cotizador o Parametros.');


  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) throw new Error('Falta configurar la clave OpenAI en el proyecto.');


  const d = {
    responsable: limpiarTextoWeb_(datos.responsable),
    operacion: limpiarTextoWeb_(datos.operacion),
    marca: resolverDatoWeb_(datos.marca, datos.marcaManual),
    modelo: resolverDatoWeb_(datos.modelo, datos.modeloManual),
    version: resolverDatoWeb_(datos.version, datos.versionManual),
    anio: String(datos.anio || '').trim(),
    factura: limpiarTextoWeb_(datos.factura),
    km: numero_(datos.km)
  };


  const faltantes = validarDatos_(d);
  if (faltantes.length) throw new Error('Faltan datos: ' + faltantes.join(', '));


  const modeloPrimario = String(params.getRange('B10').getDisplayValue() || CLASA.PRIMARY_MODEL).trim();
  const extraInicial = Math.max(0, Number(params.getRange('B11').getValue()) || 10000);
  const redondeo = Math.max(1, Number(params.getRange('B12').getValue()) || 1000);
  const maxComparables = Math.max(3, Number(params.getRange('B13').getValue()) || CLASA.MAX_COMPARABLES);
  const modeloFallback = String(params.getRange('B14').getDisplayValue() || CLASA.FALLBACK_MODEL).trim();
  const intentos = Math.max(1, Number(params.getRange('B15').getValue()) || 4);
  const esperaInicial = Math.max(500, Number(params.getRange('B16').getValue()) || 2000);
  const utilidadMin = Number(params.getRange('B2').getValue()) || 40000;
  const utilidadObj = Number(params.getRange('B3').getValue()) || 45000;


  const prompt = construirPrompt_(d, utilidadMin, utilidadObj, maxComparables);


  const response = solicitarOpenAIWebConRetry_(
    apiKey,
    prompt,
    modeloPrimario,
    modeloFallback,
    intentos,
    esperaInicial
  );


  const texto = extraerTextoRespuesta_(response);
  if (!texto) throw new Error('OpenAI respondió sin contenido analizable.');


  const resultado = JSON.parse(texto);
  normalizarResultado_(resultado, maxComparables);
  aplicarGuardrails_(resultado, utilidadMin, utilidadObj, extraInicial, redondeo);


  const folio = crearFolioWeb_();
  const usuarioWeb = Session.getActiveUser().getEmail() || '';
  const resumenFinal = construirResumenFinalWeb_(d, resultado, utilidadMin, utilidadObj);


  // Solo bloqueamos la escritura final, no el tiempo de investigación.
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    reflejarCotizacionWebEnHoja_(sh, d, resultado);
    escribirComparables_(ss, resultado.comparables || []);


    sh.getRange('K5').setValue('LISTO');
    sh.getRange('K6').setValue(new Date()).setNumberFormat('dd/mm/yyyy hh:mm');
    sh.getRange('K7').setValue(resultado.confianza || 'MEDIA');
    sh.getRange('K8').setValue((resultado.comparables || []).length + ' comparables');


    asegurarColumnasHistorialWeb_(ss);
    guardarHistorialWeb_(ss, folio, d, resultado, resumenFinal, usuarioWeb);
    guardarComparablesHistoricosWeb_(ss, folio, resultado.comparables || []);


    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }


  let expediente = null;
  try {
    if (typeof CI_iniciarExpediente === 'function') {
      expediente = CI_iniciarExpediente({
        folio: folio,
        responsable: d.responsable,
        operacion: d.operacion,
        clienteNombre: limpiarTextoWeb_(datos.clienteNombre || datos.cliente || ''),
        telefono: limpiarTextoWeb_(datos.telefono || ''),
        vehiculo: d,
        valuacion: {
          mercado_bajo: resultado.mercado_bajo,
          mercado_medio: resultado.mercado_medio,
          mercado_alto: resultado.mercado_alto,
          compra_ideal: resultado.propuesta_baja,
          compra_recomendable: resultado.compra_buen_estado,
          limite_maximo: resultado.maximo_compra,
          publicacion_sugerida: resultado.publicacion_sugerida,
          cierre_probable: resultado.cierre_probable,
          confianza: resultado.confianza,
          recomendacion: normalizarRecomendacionWeb_(resultado.recomendacion)
        }
      });
    }
  } catch (e) {
    expediente = {ok:false, error:String(e && e.message ? e.message : e)};
  }


  return {
    ok: true,
    folio,
    guardadoAutomatico: true,
    expediente: expediente,
    fecha: Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy HH:mm'),
    duracionSegundos: Math.round((new Date().getTime() - inicio.getTime()) / 1000),
    vehiculo: d,
    resultado: {
      mercado_bajo: resultado.mercado_bajo,
      mercado_medio: resultado.mercado_medio,
      mercado_alto: resultado.mercado_alto,
      propuesta_baja: resultado.propuesta_baja,
      compra_buen_estado: resultado.compra_buen_estado,
      maximo_compra: resultado.maximo_compra,
      publicacion_sugerida: resultado.publicacion_sugerida,
      precio_probable_venta: resultado.cierre_probable,
      utilidad_baja: resultado.utilidad_baja,
      utilidad_buen_estado: resultado.utilidad_buen_estado,
      utilidad_maximo: resultado.utilidad_maximo,
      utilidad_minima: utilidadMin,
      utilidad_objetivo: utilidadObj,
      recomendacion: normalizarRecomendacionWeb_(resultado.recomendacion),
      confianza: resultado.confianza,
      comparables: resultado.comparables || [],
      fuentes_consultadas: resultado.fuentes_consultadas || '',
      resumen_final: resumenFinal,
      analisis_ia: resultado.observaciones || ''
    }
  };
}


function solicitarOpenAIWebConRetry_(apiKey, prompt, modeloPrimario, modeloFallback, maxIntentos, esperaInicial) {
  const modelos = [modeloPrimario, modeloFallback].filter((m, i, a) => m && a.indexOf(m) === i);
  const retryCodes = [408, 409, 429, 500, 502, 503, 504];
  let ultimoError = null;


  for (let m = 0; m < modelos.length; m++) {
    const modelo = modelos[m];


    for (let intento = 1; intento <= maxIntentos; intento++) {
      let resp;


      try {
        resp = UrlFetchApp.fetch(CLASA.API_URL, {
          method: 'post',
          contentType: 'application/json',
          headers: { Authorization: 'Bearer ' + apiKey },
          muteHttpExceptions: true,
          payload: JSON.stringify(construirPayload_(modelo, prompt))
        });
      } catch (networkErr) {
        ultimoError = networkErr;
        if (intento < maxIntentos) {
          Utilities.sleep(Math.min(16000, esperaInicial * Math.pow(2, intento - 1)));
          continue;
        }
        break;
      }


      const code = resp.getResponseCode();
      const body = resp.getContentText();


      if (code >= 200 && code < 300) return JSON.parse(body);


      ultimoError = new Error('OpenAI API HTTP ' + code + ': ' + body);
      if (!retryCodes.includes(code)) throw ultimoError;


      if (intento < maxIntentos) {
        Utilities.sleep(Math.min(16000, esperaInicial * Math.pow(2, intento - 1)));
      }
    }
  }


  throw ultimoError || new Error('No fue posible completar la consulta a OpenAI.');
}


function validarDatosWeb_(d) {
  if (!d || typeof d !== 'object') throw new Error('No se recibieron los datos del vehículo.');
  const km = numero_(d.km);
  if (!km || km < 0 || km > 2000000) {
    throw new Error('Kilometraje inválido. Escribe únicamente números.');
  }
}


function limpiarTextoWeb_(v) {
  return String(v == null ? '' : v).trim();
}


function resolverDatoWeb_(seleccion, manual) {
  const s = limpiarTextoWeb_(seleccion);
  const m = limpiarTextoWeb_(manual);
  const u = s.toUpperCase();
  if ((u.indexOf('OTRA') === 0 || u.indexOf('OTRO') === 0) && m) return m;
  return s;
}


function crearFolioWeb_() {
  const tz = 'America/Mexico_City';
  const base = Utilities.formatDate(new Date(), tz, 'yyyyMMdd-HHmmss');
  const sufijo = Math.floor(1000 + Math.random() * 9000);
  return 'CLASA-' + base + '-' + sufijo;
}


function construirResumenFinalWeb_(d, r, min, obj) {
  return [
    'Cotización final ' + d.marca + ' ' + d.modelo + ' ' + d.version + ' ' + d.anio + '.',
    'Compra ideal: $' + formatoNumero_(r.propuesta_baja) + '.',
    'Compra recomendable: $' + formatoNumero_(r.compra_buen_estado) + '.',
    'Límite máximo: $' + formatoNumero_(r.maximo_compra) + '.',
    'Precio para publicar: $' + formatoNumero_(r.publicacion_sugerida) + '.',
    'Precio probable de venta: $' + formatoNumero_(r.cierre_probable) + '.',
    'Utilidades estimadas: $' + formatoNumero_(r.utilidad_baja) + ' / $' +
      formatoNumero_(r.utilidad_buen_estado) + ' / $' + formatoNumero_(r.utilidad_maximo) + '.',
    'Mínimo CLASA®: $' + formatoNumero_(min) + '; objetivo: $' + formatoNumero_(obj) + ' o más cuando el mercado lo permita.',
    'Recomendación: ' + normalizarRecomendacionWeb_(r.recomendacion) + '.',
    'Confianza: ' + (r.confianza || 'MEDIA') + '.',
    'La IA recomienda; la autorización final de compra es humana.'
  ].join(' ');
}


function reflejarCotizacionWebEnHoja_(sh, d, r) {
  sh.getRange('B5:B12').setValues([
    [d.responsable],
    [d.operacion],
    [d.marca],
    [d.modelo],
    [d.version],
    [Number(d.anio) || d.anio],
    [d.factura],
    [numero_(d.km)]
  ]);
  sh.getRange('B12').setNumberFormat('#,##0 "km"');


  escribirResultado_(sh, r);


  // Asegurar textos claros del dashboard.
  sh.getRange('D11').setValue('📢 Precio para publicar');
  sh.getRange('D12').setValue('💰 Precio probable de venta');
  sh.getRange('D8').setValue('🟢 COMPRA IDEAL');
  sh.getRange('D9').setValue('🟡 COMPRA RECOMENDABLE');
  sh.getRange('D10').setValue('🔴 LÍMITE MÁXIMO');
}


function asegurarColumnasHistorialWeb_(ss) {
  const hist = ss.getSheetByName(CLASA.HISTORIAL);
  if (!hist) throw new Error('No se encontró Historial.');


  const headers = [
    'Folio',
    'Confianza',
    'No. comparables',
    'Usuario web',
    'Origen',
    'Análisis IA detallado'
  ];
  hist.getRange(1, 25, 1, headers.length).setValues([headers]);
}


function guardarHistorialWeb_(ss, folio, d, r, resumenFinal, usuarioWeb) {
  const hist = ss.getSheetByName(CLASA.HISTORIAL);
  if (!hist) throw new Error('No se encontró Historial.');


  const fuentes = String(r.fuentes_consultadas || '');
  const row = [
    new Date(),
    d.responsable,
    d.operacion,
    d.marca,
    d.modelo,
    d.version,
    d.anio,
    d.factura,
    numero_(d.km),
    r.propuesta_baja,
    r.compra_buen_estado,
    r.maximo_compra,
    r.publicacion_sugerida,
    r.cierre_probable,
    r.recomendacion,
    '', '', '', '',
    resumenFinal,
    fuentes,
    r.mercado_bajo,
    r.mercado_medio,
    r.mercado_alto,
    folio,
    r.confianza,
    (r.comparables || []).length,
    usuarioWeb,
    'WEB',
    r.observaciones || ''
  ];


  hist.appendRow(row);
  const lr = hist.getLastRow();


  hist.getRange(lr, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  hist.getRange(lr, 9).setNumberFormat('#,##0');
  hist.getRange(lr, 10, 1, 8).setNumberFormat('$#,##0');
  hist.getRange(lr, 22, 1, 3).setNumberFormat('$#,##0');
  hist.getRange(lr, 20, 1, 11).setWrap(true);
}


function guardarComparablesHistoricosWeb_(ss, folio, comps) {
  let sh = ss.getSheetByName(CLASA_WEB.SHEET_HISTORIAL_COMPARABLES);


  if (!sh) {
    sh = ss.insertSheet(CLASA_WEB.SHEET_HISTORIAL_COMPARABLES);
    sh.getRange('A1:J1').setValues([[
      'Folio', 'Fecha', 'Fuente', 'Vehículo', 'Año', 'Km',
      'Precio publicado', 'Ubicación', 'URL', 'Nota'
    ]]);
    sh.setFrozenRows(1);
  }


  if (!comps || !comps.length) return;


  const ahora = new Date();
  const rows = comps.map(c => [
    folio,
    ahora,
    c.fuente || '',
    c.vehiculo || '',
    c.anio || '',
    c.km || '',
    numero_(c.precio_publicado),
    c.ubicacion || '',
    c.url || '',
    c.nota || ''
  ]);


  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
  const first = sh.getLastRow() - rows.length + 1;
  sh.getRange(first, 2, rows.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sh.getRange(first, 6, rows.length, 1).setNumberFormat('#,##0');
  sh.getRange(first, 7, rows.length, 1).setNumberFormat('$#,##0');
  sh.getRange(first, 1, rows.length, 10).setWrap(true);
}




function normalizarRecomendacionWeb_(v) {
  const s = String(v || '').trim();
  if (!s) return 'REVISAR';
  if (s.toUpperCase().indexOf('NEGOCI') >= 0) return 'REVISAR / AJUSTAR OFERTA';
  return s;
}