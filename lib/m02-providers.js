import {cert, getApps, initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import pg from 'pg';
import {createSession} from './m02-session.js';

const env = process.env;
export const session = createSession({env, firebase() {
  const app = getApps().find(app => app.name === 'soac-m02') ??
    initializeApp({credential:cert(JSON.parse(env.SOAC_FIREBASE_ADMIN_JSON))}, 'soac-m02');
  return getAuth(app);
}});

export const database = new pg.Pool({
  connectionString:env.SOAC_M02_DATABASE_URL,
  max:3,
  connectionTimeoutMillis:5000,
  statement_timeout:12000
});
