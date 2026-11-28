import {createHash, randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {database, session} from '../lib/m02-providers.js';
import {handleJson, failure} from '../lib/m02-session.js';
import {quoteFinancing} from '../public/financiamiento-calculo.mjs';

const fields = ['year','price','down','lender','months','insurance','monthlyRate','openingPercent'];
const version = 'CLASA-2026-11-24-v1';
let schema;

export function ensureQuoteSchema() {
  schema ??= readFile(new URL('../db/002_m05_quotes.sql', import.meta.url), 'utf8')
    .then(sql=>database.query(sql))
    .catch(error=>{schema=undefined;throw error;});
  return schema;
}

export async function saveQuote(db, folio, actor, input) {
  if (!input || typeof input !== 'object' || input.price > 100000000) {
    throw failure(400,'Revisa los datos de la simulación.');
  }
  const terms = Object.fromEntries(fields.map(key=>[key,input[key]]));
  if (terms.lender==='CLASA') {
    delete terms.monthlyRate;
    delete terms.openingPercent;
  }
  let result;
  try { result = quoteFinancing(terms); }
  catch (error) { throw failure(400,error.message); }
  const fingerprint = createHash('sha256').update(JSON.stringify({version,terms})).digest('hex');
  const {rows}=await db.query(
    `INSERT INTO soac_m02.financing_quotes (id,ficha_folio,actor_uid,fingerprint,terms,result)
     SELECT $1,folio,$3,$4,$5::jsonb,$6::jsonb FROM soac_m02.fichas WHERE folio=$2
     ON CONFLICT (ficha_folio,actor_uid,fingerprint) DO UPDATE SET fingerprint=EXCLUDED.fingerprint
     RETURNING id,created_at`,
    [randomUUID(),folio,actor,fingerprint,JSON.stringify(terms),JSON.stringify({version,...result})]);
  if (!rows.length) throw failure(404,'El folio de Centro Digital no existe.');
  return rows[0];
}

export default function financingQuotes(req,res) {
  return handleJson(res,async()=>{
    session.requireSetup();
    const user=await session.get(req);
    if (req.method!=='GET'&&req.method!=='POST') throw failure(405,'Método no permitido.');
    const folio=new URL(req.url,'http://localhost').searchParams.get('folio')?.trim();
    if (!folio||folio.length>200) throw failure(400,'Abre el cotizador desde la ficha de Centro Digital.');
    if(req.method==='POST'){
      session.requireOrigin(req);
      if(!user.write)throw failure(403,'Tu cuenta tiene acceso de consulta.');
      if(!req.is('application/json'))throw failure(415,'Formato inválido.');
      await ensureQuoteSchema();
      return saveQuote(database,folio,user.uid,req.body);
    }
    await ensureQuoteSchema();
    const {rows}=await database.query(
      'SELECT id,terms,result,created_at FROM soac_m02.financing_quotes WHERE ficha_folio=$1 ORDER BY created_at DESC,id DESC LIMIT 20',
      [folio]);
    return {quotes:rows,write:user.write};
  });
}

export async function probeQuoteStorage() {
  await ensureQuoteSchema();
  const db=await database.connect();
  try {
    await db.query('BEGIN');
    const {rows}=await db.query('SELECT folio FROM soac_m02.fichas ORDER BY id LIMIT 1');
    if(!rows.length)return 'schema ready; no case available';
    const input={year:2020,price:200000,down:70000,lender:'CLASA',months:12,insurance:null};
    const one=await saveQuote(db,rows[0].folio,'soac-m05-smoke',input);
    const two=await saveQuote(db,rows[0].folio,'soac-m05-smoke',input);
    const stored=await db.query('SELECT result FROM soac_m02.financing_quotes WHERE id=$1',[one.id]);
    if(one.id!==two.id||stored.rows[0]?.result?.principal!==130000)throw Error('Quote readback failed');
    return 'write, deduplication and readback verified';
  } finally {
    try { await db.query('ROLLBACK'); }
    catch (error) { db.release(error); throw error; }
    db.release();
  }
}
