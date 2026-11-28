import {GoogleAuth} from 'google-auth-library';
import {publicInventory} from '../lib/inventory-catalog.js';

const workbook = '1X-qOPULagTNcsT0rdA8Lp6Whm0qfcnvZ6sfmIv-zwLI';
let auth;
let pending;
let cached;
let expires = 0;

async function readInventory() {
  auth ??= new GoogleAuth({
    credentials: JSON.parse(process.env.SOAC_M02_IMPORT_GOOGLE_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const range = encodeURIComponent('INVENTARIO!A4:BI');
  const {data} = await client.request({
    url: 'https://sheets.googleapis.com/v4/spreadsheets/' + workbook + '/values/' + range,
    timeout: 10000
  });
  if (!Array.isArray(data.values) || !data.values.length) throw Error('Missing inventory data');
  const [headers, ...rows] = data.values;
  cached = publicInventory(headers, rows);
  expires = Date.now() + 15000;
  return cached;
}

export default async function catalogInventory(_req, res) {
  res.set('Access-Control-Allow-Origin', 'https://automotriz-clasa-sitio-publico.vercel.app');
  res.set('Cache-Control', 'no-store');
  try {
    if (Date.now() >= expires) pending ??= readInventory().finally(() => { pending = undefined; });
    const vehicles = pending ? await pending : cached;
    res.json({vehicles});
  } catch {
    res.status(503).json({error: 'El inventario no está disponible en este momento.'});
  }
}
