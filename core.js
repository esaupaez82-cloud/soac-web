import express from 'express';
import OpenAI from 'openai';
import pg from 'pg';
const {Pool}=pg;
const app=express();
app.use(express.json({limit:'1mb'}));
const hasAI=Boolean(process.env.OPENAI_API_KEY);
const hasDB=Boolean(process.env.DATABASE_URL);
const ai=hasAI?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
const pool=hasDB?new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}):null;

const RULES=`Eres el Agente Digital SOAC® de Automotriz CLASA®. Regla superior: LA CITA ES PRIMERO.
No inventes datos, horarios, disponibilidad, aprobaciones ni precios.
Una cita solo se confirma cuando el cliente acepta día y hora concretos.
No pidas INE ni correo para cotizar o agendar.
Cotización o viabilidad -> ESAU. Solo venta/compra directa/toma a cuenta -> YANELLI.
Citas/reagendas/confirmaciones -> VIANEY. Cierre/validación final -> ESAU.
Devuelve JSON con intent, operation, vehicle, stage, ownerRole, appointmentNeeded, quoteRequested, viabilityRequested, suggestedReply, nextAction, confidence.`;

function fallback(message=''){
 const m=message.toLowerCase(); let intent='CLIENTE_NUEVO',ownerRole='VIANEY',operation='POR DEFINIR';
 const quoteRequested=/cotiz|mensual|enganche|precio/.test(m), viabilityRequested=/viable|viabilidad|bur[oó]|financ|cr[eé]dito/.test(m);
 if(/reagend|otra hora|otro d[ií]a/.test(m)) intent='REAGENDA';
 else if(/confirm/.test(m)&&/cita/.test(m)) intent='CONFIRMACION';
 else if(/cita|visita|conocer|ver el/.test(m)) intent='CITA';
 else if(/vendo|vender mi|solo venta/.test(m)){intent='SOLO_VENTA';ownerRole='YANELLI';operation='SOLO VENTA'}
 else if(/toma a cuenta|reciben mi|cambio mi/.test(m)){intent='TOMA_A_CUENTA';ownerRole='YANELLI';operation='TOMA A CUENTA'}
 else if(quoteRequested){intent='COTIZACION';ownerRole='ESAU'}
 else if(viabilityRequested){intent='VIABILIDAD';ownerRole='ESAU';operation='COMPRA FINANCIAMIENTO'}
 return {intent,operation,vehicle:'',stage:'CONTACTO',ownerRole,appointmentNeeded:intent!=='SOLO_VENTA',quoteRequested,viabilityRequested,suggestedReply:intent==='SOLO_VENTA'?'Gracias. Yanelli revisará tu vehículo. Compártenos marca, modelo, año, kilometraje y tipo de factura.':'Con gusto te ayudamos. ¿Qué día y horario te funciona mejor entre 10:00 y 17:00?',nextAction:intent==='SOLO_VENTA'?'REVISAR OPERACIÓN':'LLEVAR A CITA',confidence:.72,engine:'SOAC_RULES'};
}

async function init(){
 if(!pool)return;
 await pool.query(`create table if not exists soac_contacts(id bigserial primary key,folio text unique not null,client_name text,whatsapp text,operation text,vehicle_interest text,stage text,status text default 'ACTIVO',owner_role text,next_action text,metadata jsonb default '{}'::jsonb,created_at timestamptz default now(),updated_at timestamptz default now())`);
 await pool.query(`create table if not exists soac_agent_events(id bigserial primary key,folio text,channel text,direction text,event_type text,message text,classification jsonb default '{}'::jsonb,created_at timestamptz default now())`);
 await pool.query(`create table if not exists soac_audit(id bigserial primary key,user_name text,folio text,action text,duration_ms integer,save_ms integer,metadata jsonb default '{}'::jsonb,created_at timestamptz default now())`);
}
app.get('/health',async(_q,r)=>{let db=false;if(pool){try{await pool.query('select 1');db=true}catch{}}r.json({ok:true,service:'SOAC Core',openai:hasAI,database:db,sheet:Boolean(process.env.SOAC_SHEET_ID),calendar:Boolean(process.env.SOAC_CALENDAR_ID),whatsapp:'pending'});});
app.post('/api/agent',async(q,r)=>{const b=q.body||{},message=(b.message||'').trim();if(!message)return r.status(400).json({error:'message required'});let result;
 try{if(ai){const resp=await ai.responses.create({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:[{role:'system',content:RULES},{role:'user',content:message}],text:{format:{type:'json_object'}}});result=JSON.parse(resp.output_text);result.engine='OPENAI'}else result=fallback(message);
 if(pool){try{await pool.query(`insert into soac_agent_events(folio,channel,direction,event_type,message,classification) values($1,'web','in','classified',$2,$3)`,[b.folio||null,message,result])}catch{}}
 r.json(result)}catch(e){r.status(500).json({error:e.message})}});
app.post('/api/contacts',async(q,r)=>{const b=q.body||{};if(!b.folio)return r.status(400).json({error:'folio required'});if(!pool)return r.status(503).json({error:'DATABASE_URL pending'});
 const x=await pool.query(`insert into soac_contacts(folio,client_name,whatsapp,operation,vehicle_interest,stage,status,owner_role,next_action,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(folio) do update set client_name=excluded.client_name,whatsapp=excluded.whatsapp,operation=excluded.operation,vehicle_interest=excluded.vehicle_interest,stage=excluded.stage,status=excluded.status,owner_role=excluded.owner_role,next_action=excluded.next_action,metadata=excluded.metadata,updated_at=now() returning *`,[b.folio,b.clientName||'',b.whatsapp||'',b.operation||'',b.vehicle||'',b.stage||'',b.status||'ACTIVO',b.ownerRole||'',b.nextAction||'',b.metadata||{}]);r.json(x.rows[0])});
app.get('/',(_q,r)=>r.send('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOAC Core</title><style>body{font-family:Arial;background:#09090b;color:#fff;padding:30px}.ok{color:#67df86}.warn{color:#ffd166}</style></head><body><h1>SOAC® CORE · AUTOMOTRIZ CLASA®</h1><p>Backend central para Agente Digital y base de datos.</p><div id="s">Verificando…</div><script>fetch("/health").then(r=>r.json()).then(x=>s.innerHTML="<p class=ok>Servidor: ONLINE</p><p class="+(x.openai?"ok":"warn")+">OpenAI: "+(x.openai?"CONECTADO":"PENDIENTE CLAVE")+"</p><p class="+(x.database?"ok":"warn")+">Base central: "+(x.database?"CONECTADA":"PENDIENTE ENLACE")+"</p><p class="+(x.sheet?"ok":"warn")+">SOAC Sheets: "+(x.sheet?"CONFIGURADO":"PENDIENTE")+"</p><p class="+(x.calendar?"ok":"warn")+">Calendar: "+(x.calendar?"CONFIGURADO":"PENDIENTE")+"</p>")</script></body></html>'));
init().finally(()=>app.listen(process.env.PORT||10000,()=>console.log('SOAC Core online')));

import {installRecovery} from './recovery.js';installRecovery(app,pool);
