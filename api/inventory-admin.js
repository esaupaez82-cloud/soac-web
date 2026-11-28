import {GoogleAuth} from 'google-auth-library';
import {session} from '../lib/m02-providers.js';
import {failure, handleJson} from '../lib/m02-session.js';

const workbook = '1X-qOPULagTNcsT0rdA8Lp6Whm0qfcnvZ6sfmIv-zwLI';
const endpoint = 'https://sheets.googleapis.com/v4/spreadsheets/' + workbook;
const columns = {
  folio: ['Folio Unidad', 0], marca: ['Marca', 5], modelo: ['Modelo', 6],
  anio: ['Año', 7], estado: ['Estado Comercial', 15], precio: ['Precio Venta', 17],
  publicar: ['Publicar IA', 25], disponibilidad: ['Disponibilidad declarada SOAC', 44]
};
let tail = Promise.resolve();

async function sheets(write) {
  const raw = process.env[write ? 'SOAC_INVENTORY_EDITOR_GOOGLE_JSON' : 'SOAC_M02_IMPORT_GOOGLE_JSON'];
  if (!raw) throw failure(503, 'La conexión del inventario aún no está configurada.');
  return new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/spreadsheets' + (write ? '' : '.readonly')]
  }).getClient();
}

async function read(client, range, valueRenderOption = 'FORMATTED_VALUE') {
  const {data} = await client.request({
    url: endpoint + '/values/' + encodeURIComponent(range) + '?' + new URLSearchParams({valueRenderOption}),
    timeout: 10000
  });
  return data.values ?? [];
}

function unit(row) {
  return Object.fromEntries(Object.entries(columns).map(([key, [, index]]) => [key, String(row[index] ?? '')]));
}

async function inventory(client) {
  const [headers = [], ...rows] = await read(client, 'INVENTARIO!A4:AS');
  if (Object.values(columns).some(([name,index]) => headers[index] !== name)) {
    throw failure(503, 'Los encabezados del inventario cambiaron.');
  }
  return rows;
}

function cells(values) {
  return {values: values.map(value => ({userEnteredValue: typeof value === 'number' ? {numberValue:value} : {stringValue:value}}))};
}

async function save(client, user, body) {
  const {previous, changes} = body ?? {};
  if (!previous || !changes || typeof previous.folio !== 'string' || !previous.folio.trim()) {
    throw failure(400, 'Selecciona una unidad del inventario.');
  }
  const entries = Object.entries(changes);
  const normalize = {
    precio: value => Number.isSafeInteger(value) && value > 0,
    estado: value => ['DISPONIBLE','APARTADO','VENDIDO','NO PUBLICAR'].includes(value),
    publicar: value => ['SI','NO'].includes(value)
  };
  if (!entries.length || entries.some(([key, value]) => !Object.hasOwn(normalize,key) || !normalize[key](value))) {
    throw failure(400, 'Revisa los cambios de precio, estado y publicación.');
  }
  if ((changes.publicar === 'SI' && ['VENDIDO','APARTADO','NO PUBLICAR'].includes(changes.estado))) {
    throw failure(400, 'Solo se puede autorizar la publicación de una unidad disponible.');
  }
  const rows = await inventory(client);
  const matches = rows.flatMap((row, index) => unit(row).folio === previous.folio ? [index] : []);
  if (matches.length !== 1) throw failure(409, 'El folio dejó de ser único o ya no existe.');
  const rowNumber = matches[0] + 5;
  const range = 'INVENTARIO!A' + rowNumber + ':AS' + rowNumber;
  const [latest = []] = await read(client, range);
  const [formulas = []] = await read(client, range, 'FORMULA');
  const current = unit(latest);
  const desired = {...current,...changes};
  if (changes.publicar === 'SI' && desired.estado !== 'DISPONIBLE') {
    throw failure(400, 'Solo se puede autorizar la publicación de una unidad disponible.');
  }
  if (Object.keys(columns).some(key => current[key] !== previous[key]) ||
      entries.some(([key]) => String(formulas[columns[key][1]] ?? '').startsWith('='))) {
    throw failure(409, 'La unidad cambió o el campo contiene una fórmula. Actualiza el inventario.');
  }
  const stamp = new Date().toISOString();
  const requests = entries.map(([key,value]) => ({
    updateCells: {start:{sheetId:1001,rowIndex:rowNumber-1,columnIndex:columns[key][1]},
      rows:[cells([value])],fields:'userEnteredValue'}
  }));
  requests.push({appendCells:{sheetId:9515810,rows:entries.map(([key,value]) =>
    cells([stamp,user.uid,'EDICIÓN',current.folio,rowNumber,key,current[key],String(value)])),fields:'userEnteredValue'}});
  await client.request({url:endpoint+':batchUpdate',method:'POST',data:{requests},timeout:10000});
  const [verified = []] = await read(client, range, 'UNFORMATTED_VALUE');
  if (String(verified[0] ?? '') !== current.folio ||
      entries.some(([key,value]) => String(verified[columns[key][1]]) !== String(value))) {
    throw failure(502, 'No se confirmó el guardado. Actualiza la ficha antes de reintentar.');
  }
  return {ok:true, folio:current.folio};
}

export default function inventoryAdmin(req,res) {
  return handleJson(res, async () => {
    session.requireSetup();
    const user = await session.get(req);
    const allowlist = new Set((process.env.SOAC_INVENTORY_EDITOR_UIDS ?? '').split(',').map(uid=>uid.trim()).filter(Boolean));
    const write = user.write && allowlist.has(user.uid) && Boolean(process.env.SOAC_INVENTORY_EDITOR_GOOGLE_JSON);
    if (req.method === 'GET') {
      if (!user.write) throw failure(403,'La cuenta no tiene acceso al inventario interno.');
      const rows = await inventory(await sheets(false));
      return {vehicles:rows.map(unit).filter(row=>row.folio && row.marca && row.modelo),write};
    }
    if (req.method !== 'POST') throw failure(405,'Método no permitido.');
    session.requireOrigin(req);
    if (!write) throw failure(403,'La cuenta no tiene permiso de edición de inventario.');
    if (!req.is('application/json')) throw failure(415,'Formato inválido.');
    const job = tail.then(async () => save(await sheets(true),user,req.body));
    tail = job.catch(() => {});
    return job;
  });
}
