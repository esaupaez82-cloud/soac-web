import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression guard for M02 partial updates. This does not replace a database integration test.
const source = readFileSync(new URL('../core.js', import.meta.url), 'utf8');

test('M02: partial folio update preserves existing contact data', () => {
  for (const field of ['client_name', 'whatsapp', 'operation', 'vehicle_interest', 'stage', 'owner_role', 'next_action']) {
    assert.ok(source.includes(`coalesce(nullif(excluded.${field},''),soac_contacts.${field})`), `missing safe update for ${field}`);
  }
});

test('M02: partial metadata update merges instead of replacing stored metadata', () => {
  assert.match(source, /coalesce\(soac_contacts\.metadata,'\{\}'::jsonb\) \|\| coalesce\(excluded\.metadata,'\{\}'::jsonb\)/);
});

test('M02: missing status must not reopen a sold or closed contact', () => {
  assert.ok(source.includes('status=case when $11::boolean then excluded.status else soac_contacts.status end'));
  assert.ok(source.includes('Boolean(b.status)'));
});

test('M02: database failure returns controlled response instead of crashing', () => {
  assert.ok(source.includes("r.status(503).json({error:'No se pudo guardar el expediente."));
  assert.ok(source.includes("console.error('SOAC contact persistence failed:'"));
});

test('M02: folio lookup is protected and uses parameterized SQL', () => {
  assert.ok(source.includes("app.get('/api/contacts/:folio'"));
  assert.ok(source.includes("app.get('/api/contacts/:folio',requireOpsToken,"));
  assert.ok(source.includes("where folio=$1 limit 1"));
  assert.ok(source.includes("[q.params.folio]"));
  assert.ok(source.includes("'Cache-Control','no-store'"));
});

test('M02: AI and contact writes require server-side operations token', () => {
  assert.ok(source.includes("app.post('/api/agent',requireOpsToken,"));
  assert.ok(source.includes("app.post('/api/contacts',requireOpsToken,"));
  assert.ok(source.includes("Buffer.byteLength(supplied)!==Buffer.byteLength(expected)"));
  assert.ok(source.includes("timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))"));
});

test('M02: AI errors must not reveal provider details', () => {
  assert.ok(source.includes("Servicio de IA no disponible; revisar configuración del servidor"));
  assert.ok(!source.includes("r.status(500).json({error:e.message})"));
});

test('M02: agent does not claim appointment availability or live AI connection', () => {
  assert.ok(source.includes("process.env.OPENAI_MODEL||'gpt-4.1-mini'"));
  assert.ok(!source.includes("process.env.OPENAI_MODEL||'gpt-5.6-luna'"));
  assert.ok(source.includes('Revisaremos los horarios disponibles antes de confirmar tu cita.'));
  assert.ok(source.includes('openaiConfigured:hasAI'));
});

test('M02: folio lookup shares token authentication with writes', () => {
  assert.ok(source.includes("app.get('/api/contacts/:folio',requireOpsToken,"));
  assert.ok(source.includes("app.post('/api/contacts',requireOpsToken,"));
});

test('M02: status page does not claim live AI connectivity from key presence', () => {
  assert.ok(source.includes('CLAVE CONFIGURADA (SIN PRUEBA EN VIVO)'));
  assert.ok(!source.includes('x.openai?"CONECTADO"'));
});

test('M02: agent triage uses strict structured output', () => {
  assert.ok(source.includes("type:'json_schema',name:'soac_lead_triage',strict:true"));
  assert.ok(source.includes("additionalProperties:false"));
  assert.ok(source.includes("suggestedReply:{type:'string'}"));
  assert.ok(source.includes("nextAction:{type:'string'}"));
  assert.ok(!source.includes("text:{format:{type:'json_object'}}"));
});
