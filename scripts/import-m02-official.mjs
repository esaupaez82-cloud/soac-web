import {readFile} from 'node:fs/promises';
import {GoogleAuth} from 'google-auth-library';
import pg from 'pg';
import {importSnapshot} from './import-m02.mjs';

const workbook = process.env.SOAC_M02_IMPORT_WORKBOOK_ID;
const destination = 'dpg-dc3vd7t6e07s73dngc2g-a';

async function main() {
  for (const key of ['SOAC_M02_DATABASE_URL','SOAC_M02_IMPORT_GOOGLE_JSON','SOAC_M02_IMPORT_WORKBOOK_ID']) {
    if (!process.env[key]) throw Object.assign(new Error('Falta configuración.'), {code:'MISSING_' + key});
  }
  const url = new URL(process.env.SOAC_M02_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== destination) {
    throw new Error('El destino no coincide con la URL interna de la base oficial.');
  }
  const raw = process.env.SOAC_M02_IMPORT_GOOGLE_JSON.trim();
  let credentials;
  try { credentials = JSON.parse(raw); }
  catch {
    const code = !raw.startsWith('{') ? 'GOOGLE_JSON_MISSING_OPEN_BRACE'
      : !raw.endsWith('}') ? 'GOOGLE_JSON_MISSING_CLOSE_BRACE' : 'GOOGLE_JSON_INVALID';
    throw Object.assign(new Error('Credencial inválida.'), {code});
  }
  if (credentials?.type !== 'service_account' || typeof credentials.private_key !== 'string' ||
      typeof credentials.client_email !== 'string') {
    throw Object.assign(new Error('Archivo de cuenta de servicio inválido.'), {code:'GOOGLE_JSON_WRONG_TYPE'});
  }
  const auth = await new GoogleAuth({
    credentials, scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']
  }).getClient();
  const ranges = ["'CENTRO_DIGITAL_SOAC'!A6:AA498", "'CITAS'!A4:BA1960"];
  const query = new URLSearchParams({valueRenderOption:'FORMATTED_VALUE'});
  for (const range of ranges) query.append('ranges', range);
  const {data} = await auth.request({
    url:'https://sheets.googleapis.com/v4/spreadsheets/' + workbook + '/values:batchGet?' + query
  });
  if (data.spreadsheetId !== workbook || data.valueRanges?.length !== ranges.length) {
    throw new Error('No se pudieron verificar ambos rangos oficiales.');
  }
  const [main, a0] = data.valueRanges.map(range => range.values);
  if (main?.slice(1).filter(row => row.some(cell => cell.trim())).length !== 298) {
    throw new Error('El conteo del origen cambió. Se necesita cotejarlo de nuevo.');
  }
  const db = new pg.Client({connectionString:url.href, connectionTimeoutMillis:5000, statement_timeout:30000});
  await db.connect();
  try {
    await db.query('SELECT pg_advisory_lock(1559351002)');
    const {rows} = await db.query("SELECT to_regnamespace('soac_m02') IS NULL AS missing");
    if (rows[0].missing) {
      await db.query(await readFile(new URL('../db/001_m02_private.sql', import.meta.url), 'utf8'));
    }
    const result = await importSnapshot(db, {main, a0});
    console.log(JSON.stringify(result));
  } finally {
    await db.end();
  }
}

main().catch(error => {
  console.error('Importación sin confirmar. Código:', error.code || error.name);
  process.exitCode = 1;
});
