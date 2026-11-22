import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const file=p=>readFileSync(new URL(p,root),'utf8');
test('Premium portal source is a complete HTML document',()=>{
 const s=file('src/public/index.html');
 assert.match(s,/<!doctype html>/i);
 assert.match(s,/<\/html>/i);
 assert.match(s,/compra-premium\.html/);
 assert.match(s,/financiamiento-premium\.html/);
});
test('Premium original source routes exist and match preserved backups',()=>{
 for(const [route,backup] of [
  ['src/public/compra-premium.html','src/recovered-originals/compra-inteligente-premium.html'],
  ['src/public/financiamiento-premium.html','src/recovered-originals/cotizador-financiamiento-premium.html'],
  ['src/public/compra-inteligente-17.html','src/recovered-originals/compra-inteligente-premium.html']
 ]) {
  assert.equal(file(route),file(backup),route+' differs from original');
  assert.match(file(route),/<\/html>/i);
 }
});
test('Original Apps Script dependencies preserved separately',()=>{
 for(const path of ['compra-webapp.gs','compra-flujo.gs','compra-portal.gs','CLASA_v6.gs']){
  const name='src/recovered-originals/apps-script/'+path;
  assert.ok(existsSync(new URL(name,root)),name);
  assert.ok(file(name).length>1000);
 }
});
test('M02 single operational entrypoint remains unchanged',()=>{
 const m=file('src/public/modulo-02.html');
 assert.match(m,/soac-m02-editor\.js/);
 assert.match(m,/soac-portal\.js/);
});
