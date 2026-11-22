(()=&gt;{'use strict';
const SHEET_ID='1X-qOPULagTNcsT0rdA8Lp6Whm0qfcnvZ6sfmIv-zwLI';
const MODULES=[{"n":"01","name":"Dirección","tag":"Indicadores de noviembre, metas y decisiones","main":"DIRECCION_NOV_2026","range":"A5:D130","alt":[["Metas 2026","DIRECCION_METAS_2026","A1:J55"]],"orig":"/direccion-premium.html","hint":"Indicadores a conciliar con M02 y Google Calendar corporativo."},{"n":"02","name":"Centro Digital","tag":"Ficha única, seguimiento y agenda","main":"CENTRO_DIGITAL_SOAC","range":"A6:AA498","alt":[["Citas registradas","CITAS","A4:BA400"]],"orig":"/centro-digital-premium.html","hint":"Ficha única de clientes: edición autorizada y comprobación de guardado. Citas en Google Calendar corporativo."},{"n":"03","name":"Inventario","tag":"Unidades, precios, estado, publicación y trazabilidad","main":"INVENTARIO","range":"A4:AO400","alt":[["Operación física","OPERACION","A4:AZ400"]],"orig":"/inventario-premium.html","hint":"No anunciar una unidad vendida; publicaciones externas aún necesitan sincronización."},{"n":"04","name":"Compra Inteligente","tag":"Solicitudes de compra y toma a cuenta por folio","main":"COMPRAS_TOMA","range":"A4:AZ400","alt":[["Propuestas y valuación","COTIZADOR","A4:AF400"]],"orig":"/compra-inteligente-17.html","hint":"Propuesta preliminar primero; revisión y cita después del interés del propietario."},{"n":"05","name":"Cotizador de Financiamiento","tag":"Cotizaciones registradas y acceso a calculadora oficial","main":"COTIZACIONES_WEB_SOAC","range":"A1:AZ400","alt":[["Parámetros financieros","CATALOGO_FIN","A1:N110"]],"orig":"/financiamiento-premium.html","hint":"Cotización y viabilidad no equivalen a aprobación crediticia."},{"n":"06","name":"Expediente Maestro","tag":"Índice restringido de archivos por cliente, vehículo y operación","main":"SOAC_ARCHIVOS","range":"A1:U500","alt":[["Identidades y folios","SOAC_IDENTIDADES","A1:M300"]],"orig":"/expediente-maestro.html","hint":"La documentación sensible solo puede consultarse con identidad y permiso autorizados."},{"n":"07","name":"Financiamiento","tag":"Validaciones, financieras, expediente y resolución","main":"FINANCIAMIENTO","range":"A4:BD500","alt":[["Citas relacionadas","CITAS","A4:BA400"]],"orig":"/financiamiento-gestion-premium.html","hint":"56 columnas oficiales. VIABLE ≠ APROBADO. No duplicar documentos."},{"n":"08","name":"Pagos y Cobranza","tag":"Ventas, saldos, contratos y entregas","main":"VENTAS","range":"A4:AZ500","alt":[["Operaciones","OPERACION","A4:AZ400"]],"orig":"/pagos-cobranza-premium.html","hint":"Importes registrados no comprueban la recepción de dinero. Conciliar con recibos."},{"n":"09","name":"Preparación de Unidades","tag":"Lavado, estética, trabajos y costos","main":"LAVADO_ESTETICA","range":"A4:AZ500","alt":[["Costos por unidad","COSTOS_UNIDAD","A3:AZ500"],["Operación de piso","OPERACION","A4:AZ400"]],"orig":"/preparacion-premium.html","hint":"Una unidad se libera únicamente cuando el trabajo y los requisitos físicos estén verificados."},{"n":"10","name":"Reportes y Tablero","tag":"Indicadores vigentes y reportes históricos","main":"DIRECCION_NOV_2026","range":"A5:D130","alt":[["Histórico octubre","TABLERO_COMERCIAL_OCT_2026","A3:AN60"],["Supervisión Centro Digital","SUPERVISION_CENTRO_DIGITAL","A2:O300"]],"orig":"/reportes-premium.html","hint":"Octubre es histórico. Los valores de noviembre requieren conciliación con las fuentes reales."},{"n":"11","name":"Recursos Humanos","tag":"Vacantes, candidatos y entrevistas","main":"RH_VACANTES","range":"A1:T250","alt":[["Candidatos","RH_CANDIDATOS","A1:Q500"],["Entrevistas","RH_ENTREVISTAS","A1:N400"]],"orig":"/modulo-11.html","hint":"Reclutamiento interno. Acceso según permisos de Google Sheets."}];
const code=(document.body.dataset.mod||'01').padStart(2,'0');
const current=MODULES.find(x=&gt;x.n===code)||MODULES[0];
const source=(new URLSearchParams(location.search)).get('s')||'main';
const sourceMap=new Map([['main',{label:'Principal',sheet:current.main,range:current.range}],...current.alt.map((a,i)=&gt;['a'+i,{label:a[0],sheet:a[1],range:a[2]}])]);
let activeSource=sourceMap.has(source)?source:'main';
let accessToken=null,client=null,records=[],columns=[],visible=[],page=0,filterIndex=-1;
const size=30;
const $=s=&gt;document.querySelector(s);
const el=(tag,cls,txt)=&gt;{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
const urlFor=(n)=&gt;'/modulo-'+n+'.html';
const originSheet=(name)=&gt;'https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/edit#gid='+sheetGids[name];
const sheetGids={"DIRECCION_NOV_2026":2026111601,"DIRECCION_METAS_2026":1926214747,"CENTRO_DIGITAL_SOAC":1909190001,"CITAS":1004,"INVENTARIO":1001,"OPERACION":1007,"COMPRAS_TOMA":1002,"COTIZADOR":1003,"COTIZACIONES_WEB_SOAC":1909222601,"CATALOGO_FIN":1909190401,"SOAC_ARCHIVOS":1861019002,"SOAC_IDENTIDADES":1861019001,"FINANCIAMIENTO":1006,"VENTAS":1005,"LAVADO_ESTETICA":843318095,"COSTOS_UNIDAD":1370154349,"TABLERO_COMERCIAL_OCT_2026":157317115,"SUPERVISION_CENTRO_DIGITAL":1909190901,"RH_VACANTES":688993484,"RH_CANDIDATOS":1309332247,"RH_ENTREVISTAS":2033682357};
function build(){
const shell=el('div','shell'),aside=el('aside','aside'),brand=el('div','brand'),logo=document.createElement('img');
logo.src='/assets/logo-oficial-clasa.jpg';logo.alt='Automotriz CLASA®';brand.append(logo,el('p','', 'SOAC® V4 · MÓDULOS OFICIALES'));aside.append(brand);
const nav=el('nav','nav');nav.setAttribute('aria-label','Módulos de SOAC');
MODULES.forEach(m=&gt;{const a=el('a',m.n===code?'active':'');a.href=urlFor(m.n);const num=el('b','',m.n);a.append(num,document.createTextNode(m.name));nav.append(a)});aside.append(nav);shell.append(aside);
const main=el('main'),top=el('div','top');top.append(el('small','', 'SOAC® / CONTROL OPERATIVO / MÓDULO '+code),el('span','tag','ACCESO PRIVADO'));main.append(top);
const ct=el('div','content'),hero=el('section','hero'),about=el('div');about.append(el('small','', 'AUTOMOTRIZ CLASA® · WEB PREMIUM'),el('h1','',current.name),el('p','',current.tag));hero.append(about,el('span','n',current.n));ct.append(hero);
const warn=el('p','notice',code==='02'?'Centro Digital: editar fichas existentes con autorización Google. Se verifica identidad, folio, valores previos y relectura tras guardar. Altas nuevas bloqueadas hasta garantizar folio único.':'Consulta privada con Google. Este módulo permanece en lectura mientras se validan procesos.');ct.append(warn);
const actions=el('div','bar');
const home=el('a','btn ghost','← Once módulos');home.href='/soac-v4.html';actions.append(home);
if(current.orig!==urlFor(code)&amp;&amp;code!=='02'){const original=el('a','btn','Herramienta premium original');original.href=current.orig;actions.append(original);}
const login=el('button','btn red','Conectar Google y cargar datos');login.id='login';actions.append(login);
const reload=el('button','btn','Actualizar registros');reload.id='refresh';reload.disabled=true;actions.append(reload);ct.append(actions);
const box=el('section','card');box.append(el('h2','', 'Tabla oficial · '+current.name),el('p','',current.hint));
const src=el('div','bar');sourceMap.forEach((v,k)=&gt;{const a=el('a','btn '+(k===activeSource?'red':'ghost'),v.label);a.href=urlFor(code)+(k==='main'?'':'?s='+encodeURIComponent(k));src.append(a)});box.append(src);
const live=el('div','live');live.id='live';live.append(el('span','dot'),el('span','', 'Sin autorización Google. Los datos privados permanecen ocultos.'));box.append(live);
const connect=el('div','',undefined);connect.id='connect-area';connect.append(el('p','', code==='02'?'Usa tu cuenta Google autorizada. Se solicitará permiso para editar fichas existentes del archivo oficial.':'Selecciona cuenta Google con permiso de lectura del archivo oficial.'));box.append(connect);
const tableArea=el('div','');tableArea.id='table-area';tableArea.hidden=true;
const tools=el('div','toolbar');const search=el('input','search');search.id='search';search.type='search';search.placeholder='Buscar folio, vehículo, cliente, estado...';search.autocomplete='off';search.setAttribute('aria-label','Buscar registros');
const sel=el('select','filter');sel.id='filter';sel.setAttribute('aria-label','Filtrar estado');
const count=el('span','count');count.id='count';tools.append(search,sel,count);tableArea.append(tools);
const scroll=el('div','scroll');scroll.id='scroll';const tbl=el('table');const head=el('thead');head.id='thead';const body=el('tbody');body.id='tbody';tbl.append(head,body);scroll.append(tbl);tableArea.append(scroll);
const pager=el('div','pager');pager.id='pager';tableArea.append(pager);
const detail=el('section','detail');detail.id='detail';detail.hidden=true;tableArea.append(detail);box.append(tableArea);ct.append(box);
const secondary=el('div','card');secondary.append(el('h2','', 'Accesos complementarios'),el('p','', 'El enlace al archivo de Sheets es secundario y puede abrir el libro completo en la aplicación móvil. La tabla principal está aquí, dentro de SOAC® Web.'));
const links=el('div','links');const sheetAnchor=el('a','btn ghost','Abrir origen en Sheets (avanzado)');sheetAnchor.id='sheet-source';sheetAnchor.target='_blank';sheetAnchor.rel='noopener noreferrer';links.append(sheetAnchor);secondary.append(links);ct.append(secondary);
main.append(ct,el('footer','foot','SOAC® V4 · Automotriz CLASA® · Privado · Token solo en memoria · Control oficial Google Sheets'));
shell.append(main);document.body.append(shell);
login.addEventListener('click',connectGoogle);reload.addEventListener('click',loadData);
search.addEventListener('input',()=&gt;{page=0;apply()});sel.addEventListener('change',()=&gt;{page=0;apply()});
$('#sheet-source').href=originSheet(sourceMap.get(activeSource).sheet);
}
function status(message,kind){const t=$('#live');t.replaceChildren(el('span','dot '+(kind||'')),el('span',kind==='bad'?'status-error':'',message));}
function explain(error){let s=String(error&amp;&amp;error.message||error||'Error desconocido');if(s.length&gt;350)s=s.slice(0,350);return s;}
async function connectGoogle(){
try{
 status('Preparando la autorización de lectura…');
 const r=await fetch('/firebase-applet-config.json',{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error('No se pudo leer la configuración existente de identidad.');
 const cfg=await r.json();
 if(!cfg.oAuthClientId||!cfg.oAuthClientId.endsWith('.apps.googleusercontent.com'))throw Error('Falta un cliente OAuth web válido en la configuración existente.');
 if(!window.google||!window.google.accounts||!window.google.accounts.oauth2)throw Error('El servicio de autenticación de Google no cargó. Comprueba bloqueo de ventanas y vuelve a abrir.');
 if(!client)client=window.google.accounts.oauth2.initTokenClient({client_id:cfg.oAuthClientId,scope:code==='02'?'https://www.googleapis.com/auth/spreadsheets':'https://www.googleapis.com/auth/spreadsheets.readonly',callback:(resp)=&gt;{if(resp&amp;&amp;resp.access_token){accessToken=resp.access_token;$('#refresh').disabled=false;$('#login').textContent='Reconectar Google';loadData()}else{accessToken=null;status('Google no concedió permiso de lectura: '+explain(resp&amp;&amp;resp.error||'solicitud cancelada'),'bad')}}});
 client.requestAccessToken({prompt:'consent'});
}catch(e){status(explain(e),'bad');}
}
async function loadData(){
if(!accessToken){status('Conecta primero tu cuenta de Google con acceso al archivo oficial.','bad');return}
const selected=sourceMap.get(activeSource);
try{
 $('#refresh').disabled=true;status('Consultando '+selected.sheet+' en Google Sheets…');
 const range="'"+selected.sheet.replace(/'/g,"''")+"'!"+selected.range;
 const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(SHEET_ID)+'/values/'+encodeURIComponent(range)+'?valueRenderOption=FORMATTED_VALUE';
 const ctrl=new AbortController();const timer=setTimeout(()=&gt;ctrl.abort(),18000);
 let r;try{r=await fetch(url,{headers:{Authorization:'Bearer '+accessToken},cache:'no-store',signal:ctrl.signal})}finally{clearTimeout(timer)}
 if(!r.ok){let err;try{err=await r.json()}catch{err={}};if(r.status===401)accessToken=null;const detail=err.error?.message||'Verifica autorización de Sheets API, proyecto y permisos de la cuenta.';throw Error('Google Sheets '+r.status+': '+String(detail).slice(0,180))}
 const payload=await r.json();const values=payload.values||[];if(values.length===0)throw Error('El rango existe pero está vacío; comprueba su estructura en la fuente oficial.');
 columns=values[0].map(String);const headerRow=Number((selected.range.match(/\d+/)||[1])[0]);records=values.slice(1).map((row,i)=&gt;{row.__sheetRow=headerRow+1+i;return row}).filter(row=&gt;row.some(v=&gt;String(v).trim()!==''));$('#table-area').hidden=false;$('#connect-area').hidden=true;$('#detail').hidden=true;$('#search').value='';filterIndex=findStatusColumn(columns);buildFilter();page=0;apply();
 status('LECTURA AUTORIZADA · '+records.length+' filas recibidas de '+selected.sheet+' · '+new Date().toLocaleString('es-MX'), 'good');
}catch(e){$('#table-area').hidden=true;status(explain(e)+' · No se mostraron datos privados.', 'bad')}finally{$('#refresh').disabled=!accessToken}
}
function findStatusColumn(cols){return cols.findIndex(x=&gt;/^(estado validaci[oó]n|estado comercial|estado venta|estado cita|estado|estatus|estado final|situaci[oó]n)$/i.test(x.trim()))}
function buildFilter(){const sel=$('#filter');sel.replaceChildren(el('option','', 'Todos los estados'));sel.options[0].value='';if(filterIndex&lt;0){sel.disabled=true;return}sel.disabled=false;
const unique=[...new Set(records.map(r=&gt;String(r[filterIndex]||'').trim()))].filter(Boolean).sort((a,b)=&gt;a.localeCompare(b,'es'));unique.slice(0,90).forEach(x=&gt;{const o=el('option','',x);o.value=x;sel.append(o)});
}
function apply(){
const term=$('#search').value.trim().toLocaleLowerCase('es-MX'),f=$('#filter').value;visible=records.filter(r=&gt;(!f||String(r[filterIndex]||'').trim()===f)&amp;&amp;(!term||r.some(v=&gt;String(v).toLocaleLowerCase('es-MX').includes(term))));
const pages=Math.max(1,Math.ceil(visible.length/size));page=Math.max(0,Math.min(page,pages-1));$('#count').textContent=visible.length+' / '+records.length+' registros';
const tr=el('tr');const columnsShown=columns.length;columns.forEach(c=&gt;{const h=el('th','',c||'—');tr.append(h)});tr.append(el('th','','Detalles'));$('#thead').replaceChildren(tr);
const body=$('#tbody');body.replaceChildren();
visible.slice(page*size,(page+1)*size).forEach(row=&gt;{const tr=el('tr');for(let i=0;i<columnsshown;i++){let>details(row));x.append(btn);tr.append(x);body.append(tr)});
const pager=$('#pager');pager.replaceChildren();const prev=el('button','', 'Anterior');prev.disabled=page===0;prev.addEventListener('click',()=&gt;{page--;apply()});pager.append(prev,el('span','', 'Página '+(page+1)+' de '+pages));const next=el('button','', 'Siguiente');next.disabled=page&gt;=pages-1;next.addEventListener('click',()=&gt;{page++;apply()});pager.append(next);
}
function details(row){const d=$('#detail');d.hidden=false;d.replaceChildren(el('h3','', 'Ficha del registro seleccionado'));const facts=el('div','facts');columns.forEach((name,i)=&gt;{const block=el('div','fact');block.append(el('small','',name||'Columna '+(i+1)),el('strong','',row[i]===undefined||row[i]===''?'Sin registro':row[i]));facts.append(block)});d.append(facts);if(code==='02'&amp;&amp;activeSource==='main'&amp;&amp;typeof window.SOAC_M02_EDITOR==='function'){window.SOAC_M02_EDITOR({token:accessToken,row,status,afterSave:(saved)=&gt;{for(const [i,v] of saved)row[i]=v;apply()}})}d.scrollIntoView({behavior:'smooth',block:'start'});}
build();
})();
</columnsshown;i++){let>