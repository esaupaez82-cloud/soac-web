(function(){'use strict';
const ID='1X-qOPULagTNcsT0rdA8Lp6Whm0qfcnvZ6sfmIv-zwLI',SH="'CENTRO_DIGITAL_SOAC'";
const FIELDS=[[3,'Operación',400],[4,'Etapa',1000],[5,'Siguiente acción',8000],[6,'Responsable',200],[7,'Próximo contacto',400],[9,'Control de contacto',4000],[24,'Resultado de gestión',8000],[25,'Fecha de gestión',400],[26,'Prioridad de revisión',1000]];
function col(i){let n=i+1,s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el}
async function api(url,token,opts={}){
 const r=await fetch(url,{...opts,headers:{Authorization:'Bearer '+token,...(opts.headers||{})},cache:'no-store'});
 let data={};try{data=await r.json()}catch{}if(!r.ok)throw Error('Google Sheets '+r.status+': '+String(data?.error?.message||'Permiso insuficiente').slice(0,180));
 return data;
}
const base='https://sheets.googleapis.com/v4/spreadsheets/'+ID;
async function readRow(token,row){
 const range=encodeURIComponent(SH+'!A'+row+':AA'+row);
 const res=await api(base+'/values/'+range+'?valueRenderOption=FORMATTED_VALUE',token);
 return res.values?.[0]||[];
}
window.SOAC_M02_EDITOR=function({token,row,status,afterSave}){
 const detail=document.getElementById('detail');if(!detail||!token)return;
 const n=row.__sheetRow,identity=[String(row[0]||'').trim(),String(row[1]||'').trim(),String(row[10]||'').trim()];
 const form=document.createElement('form');form.style.cssText='padding:18px;margin-top:20px;border:1px solid #596070;border-radius:12px;display:grid;gap:13px';
 form.append(node('h3','Editar ficha existente · Centro Digital'),node('p','Nombre, teléfono y folio no se pueden modificar aquí. No se crean registros nuevos.'));
 if(!Number.isInteger(n)||n<7||identity.some(v=>!v)){form.append(node('p','NO REGISTRADO · Ficha sin folio o identidad completa.'));detail.append(form);return}
 const controls=FIELDS.map(([i,label,max])=>{
  const wrap=document.createElement('label');wrap.style.cssText='display:grid;gap:5px;font-weight:600';
  wrap.append(node('span',label));
  const field=document.createElement([5,9,24].includes(i)?'textarea':'input');
  if(field.tagName==='TEXTAREA')field.rows=3;else field.type='text';
  field.value=String(row[i]||'');field.maxLength=max;
  field.style.cssText='box-sizing:border-box;width:100%;padding:10px;border:1px solid #768199;border-radius:7px;background:#1b2231;color:#fff';
  wrap.append(field);form.append(wrap);return[i,field];
 });
 const save=node('button','Guardar y verificar');save.className='btn red';save.type='submit';form.append(save);
 const feedback=node('p','Cambios sin guardar');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');form.append(feedback);
 let saving=false;
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(saving)return;
  const changed=controls.map(([i,el])=>[i,el.value]).filter(([i,v])=>v!==String(row[i]||''));
  if(!changed.length){feedback.textContent='No hay cambios nuevos';return}
  const wanted=Object.fromEntries(controls.map(([i,el])=>[i,el.value]));
  if(!String(wanted[5]||'').trim()||!String(wanted[6]||'').trim()){feedback.textContent='Responsable y siguiente acción obligatorios';return}
  saving=true;save.disabled=true;feedback.textContent='Comprobando identidad, folio y cambios recientes...';
  try{
   const actual=await readRow(token,n);
   if([0,1,10].some((i,k)=>String(actual[i]||'').trim()!==identity[k]))throw Error('La identidad o el folio han cambiado. No se guardó.');
   for(const [i] of changed){if(String(actual[i]||'')!==String(row[i]||''))throw Error('Otro usuario editó '+FIELDS.find(f=>f[0]===i)[1]+'. Actualiza primero.')}
   const body={valueInputOption:'RAW',data:changed.map(([i,v])=>({range:SH+'!'+col(i)+n,majorDimension:'ROWS',values:[[v]]}))};
   feedback.textContent='Guardando en la hoja oficial...';
   await api(base+'/values:batchUpdate',token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const verified=await readRow(token,n);
   if([0,1,10].some((i,k)=>String(verified[i]||'').trim()!==identity[k])||changed.some(([i,v])=>String(verified[i]||'')!==v))throw Error('Escritura enviada, pero relectura no coincide. Revisar antes de reintentar.');
   afterSave(changed);feedback.textContent='EXISTENTE ACTUALIZADO Y VERIFICADO · fila '+n;status(feedback.textContent,'good');
  }catch(err){feedback.textContent='NO REGISTRADO · '+String(err.message||err);status(feedback.textContent,'bad')}
  finally{saving=false;save.disabled=false}
 });
 detail.append(form);
};
})();