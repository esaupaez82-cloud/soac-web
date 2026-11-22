import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const source = read('public/soac-m02-editor.js');
const portal = read('public/soac-portal.js');
const html = read('public/modulo-02.html');
const config = JSON.parse(read('public/firebase-applet-config.json'));

function node(tag) {
  const o = {
    tagName: tag.toUpperCase(), children: [], events: {}, value: '', textContent: '',
    disabled: false, style: {}, attributes: {},
    append(...c) { this.children.push(...c); },
    setAttribute(k,v) { this.attributes[k] = v; },
    addEventListener(k, fn) { this.events[k] = fn; }
  };
  return o;
}
function harness(options={}) {
  const detail=node('section');
  const created=[];
  const document={
    getElementById(id) { return id==='detail' ? detail : null; },
    createElement(tag) { const el=node(tag); created.push(el); return el; }
  };
  const original=Array(27).fill('');
  original[0]='Cliente de prueba';
  original[1]='5500000000';
  original[4]='Pendiente';
  original[5]='Llamar cliente';
  original[6]='Responsable prueba';
  original[10]='SOAC-TEST-0001';
  original.__sheetRow=7;
  const remote=original.slice();
  if(options.remoteChange) remote[options.remoteChange.index]=options.remoteChange.value;
  let writes=0, reads=0, changes=[], calls=[];
  const fetch=async (url, opts={})=>{
    calls.push({url,opts});
    if(opts.method==='POST'){
      writes++;
      if(options.failWrite) return {ok:false,status:403,json:async()=>({error:{message:'Sin permiso'}})};
      for(const x of JSON.parse(opts.body).data){
        assert.match(x.range, /^'CENTRO_DIGITAL_SOAC'![A-Z]+7$/);
        const col=x.range.match(/!([A-Z]+)/)[1].split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
        remote[col]=x.values[0][0];
      }
      return {ok:true,status:200,json:async()=>({totalUpdatedCells:1})};
    }
    reads++;
    return {ok:true,status:200,json:async()=>({values:[remote.slice()]})};
  };
  const context={window:{},document,fetch,console};
  vm.runInNewContext(source,context);
  const messages=[];
  context.window.SOAC_M02_EDITOR({
    token:'TEST_TOKEN_NOT_REAL',
    row:original,
    status:(msg,kind)=>messages.push({msg,kind}),
    afterSave:(saved)=>{
      changes=saved;
      for(const [i,v] of saved) original[i]=v;
    }
  });
  const form=detail.children.find(n=>n.tagName==='FORM');
  assert.ok(form,'editor should show a form');
  const field=label=>{
    const l=form.children.find(x=>x.tagName==='LABEL'&&x.children.some(y=>y.tagName==='SPAN'&&y.textContent===label));
    assert.ok(l,'field missing: '+label);
    return l.children.find(x=>x.tagName==='INPUT'||x.tagName==='TEXTAREA');
  };
  return {form,field,remote,original,messages,calls,get writes(){return writes},get reads(){return reads},get changes(){return changes}, async save(){
    const h=form.events.submit;
    assert.ok(h,'form submit handler required');
    await h({preventDefault(){}});
  }};
}

test('M02 uses the single official source and includes OAuth and editor scripts',()=>{
  assert.match(html,/data-mod="02"/);
  assert.match(html,/soac-portal\.js/);
  assert.match(html,/soac-m02-editor\.js/);
  assert.match(portal,/CENTRO_DIGITAL_SOAC/);
  assert.match(portal,/A6:AA498/);
  assert.match(portal,/sheets\.googleapis\.com/);
  assert.ok(config.oAuthClientId.endsWith('.apps.googleusercontent.com'));
});
test('M02 edit of an existing fictitious record verifies before and after writing',async()=>{
  const h=harness();
  h.field('Etapa').value='Contactado';
  await h.save();
  assert.equal(h.reads,2);
  assert.equal(h.writes,1);
  assert.equal(h.remote[4],'Contactado');
  assert.equal(h.original[4],'Contactado');
  assert.equal(h.changes.length,1);
  assert.match(h.messages.at(-1).msg,/ACTUALIZADO Y VERIFICADO/);
  assert.equal(h.messages.at(-1).kind,'good');
  assert.ok(h.calls.every(c=>c.opts.headers.Authorization==='Bearer TEST_TOKEN_NOT_REAL'));
});
test('M02 does not overwrite a field changed by another agent',async()=>{
  const h=harness({remoteChange:{index:4,value:'Ya aprobado'}});
  h.field('Etapa').value='Contactado';
  await h.save();
  assert.equal(h.writes,0);
  assert.match(h.messages.at(-1).msg,/Otro usuario editó/);
});
test('M02 blocks saving if identity or folio differs',async()=>{
  const h=harness({remoteChange:{index:10,value:'FOLIO-DIFERENTE'}});
  h.field('Etapa').value='Contactado';
  await h.save();
  assert.equal(h.writes,0);
  assert.match(h.messages.at(-1).msg,/La identidad o el folio han cambiado/);
});
test('M02 never creates a record when the existing folio is missing',()=>{
  const detail=node('div');
  const context={window:{},document:{getElementById:()=>detail,createElement:node},fetch:()=>{throw Error('fetch not expected')}};
  vm.runInNewContext(source,context);
  const row=Array(27).fill('');
  row[0]='Prueba';row[1]='5500000000';row.__sheetRow=7;
  context.window.SOAC_M02_EDITOR({token:'TEST',row,status:()=>{},afterSave:()=>{}});
  assert.equal(detail.children.length,1);
  assert.ok(detail.children[0].children.some(x=>x.textContent.includes('NO REGISTRADO')));
});
test('M02 does not submit an unchanged record',async()=>{
  const h=harness();
  await h.save();
  assert.equal(h.writes,0);
  assert.equal(h.reads,0);
});
test('M02 requires next action and responsible before write',async()=>{
  const h=harness();
  h.field('Siguiente acción').value='';
  h.field('Etapa').value='Contactado';
  await h.save();
  assert.equal(h.writes,0);
  assert.equal(h.reads,0);
});
test('M02 does not claim saved status if Google rejects write',async()=>{
  const h=harness({failWrite:true});
  h.field('Etapa').value='Contactado';
  await h.save();
  assert.equal(h.writes,1);
  assert.equal(h.reads,1);
  assert.match(h.messages.at(-1).msg,/NO REGISTRADO/);
  assert.equal(h.messages.at(-1).kind,'bad');
  assert.equal(h.original[4],'Pendiente');
});
