import express from 'express';
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
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

if (process.env.RENDER === 'true' && process.env.SOAC_M02_RUN_IMPORT === 'true') {
  const script = fileURLToPath(new URL('./import-m02-official.mjs', import.meta.url));
  execFile(process.execPath, [script], {timeout:180000}, (error, stdout, stderr) => {
    if (error) {
      const code = /Código: ([A-Za-z0-9_]+)/.exec(stderr)?.[1] || 'unknown';
      console.log('M02 import stopped: ' + code);
      return;
    }
    try {
      const {counts, clearedInvalidPhones, alreadyImported} = JSON.parse(stdout);
      console.log('M02 import verified: ' + JSON.stringify({counts, clearedInvalidPhones, alreadyImported}));
    } catch {
      console.log('M02 import result could not be verified');
    }
  });
}

async function checkFirebaseAdmin() {
  const credentialJson = process.env.SOAC_FIREBASE_ADMIN_JSON;
  if (!credentialJson) return;
  let credential;
  let web;
  try {
    credential = JSON.parse(credentialJson.trim());
    web = JSON.parse(process.env.SOAC_FIREBASE_WEB_CONFIG_JSON);
  } catch {
    console.log('M02 Firebase: invalid JSON');
    return;
  }
  if (credential.project_id !== 'soac-centro-digital-acceso' || web.projectId !== credential.project_id) {
    console.log('M02 Firebase: project mismatch');
    return;
  }
  try {
    const {cert, initializeApp, deleteApp} = await import('firebase-admin/app');
    const {getAuth} = await import('firebase-admin/auth');
    const app = initializeApp({credential:cert(credential)}, 'soac-m02-readiness');
    try {
      await getAuth(app).listUsers(1);
      console.log('M02 Firebase: admin connection verified');
    } finally {
      await deleteApp(app);
    }
  } catch {
    console.log('M02 Firebase: admin connection rejected');
  }
}
if (process.env.RENDER === 'true') void checkFirebaseAdmin();
