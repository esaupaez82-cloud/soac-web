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
