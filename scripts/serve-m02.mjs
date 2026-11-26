import express from 'express';
import auth from '../api/auth.js';
import m02 from '../api/m02.js';
import {database} from '../lib/m02-providers.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'64kb'}));
app.get('/health', (_req, res) => res.status(204).end());
app.all('/api/auth', auth);
app.all('/api/m02', m02);
app.listen(Number(process.env.PORT || 10000), '0.0.0.0');

async function checkPrivateDatabase() {
  if (!process.env.SOAC_M02_DATABASE_URL) {
    console.log('M02 readiness: database configuration missing');
    return;
  }
  try {
    const {rows} = await database.query("SELECT to_regclass('soac_m02.fichas') IS NOT NULL AS schema_ready");
    console.log('M02 readiness: database connected; schema ' + (rows[0].schema_ready ? 'ready' : 'missing'));
  } catch {
    console.log('M02 readiness: database connection failed');
  }
  for (const key of ['SOAC_M02_IMPORT_GOOGLE_JSON', 'SOAC_M02_IMPORT_WORKBOOK_ID', 'SOAC_FIREBASE_ADMIN_JSON']) {
    console.log('M02 readiness: ' + key + (process.env[key] ? ' configured' : ' missing'));
  }
}
if (process.env.RENDER === 'true') void checkPrivateDatabase();
