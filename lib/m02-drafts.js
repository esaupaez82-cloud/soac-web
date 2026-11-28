import OpenAI from 'openai';
import {failure} from './m02-session.js';

const guidance = new Map([
  ['Cita', 'Pregunta qué día y horario le conviene. Sujeto a disponibilidad.'],
  ['Financiamiento', 'Ofrece revisar opciones o preparar una simulación. Evita afirmar aprobaciones, tasas o plazos.'],
  ['Documentos pendientes', 'Pide que contacte al equipo para coordinar la entrega segura de los documentos pendientes. Evita nombrar documentos o pedir que envíe datos personales por WhatsApp.']
]);

export async function prepareDraft(db, body, client) {
  const {folio, stage} = body ?? {};
  if (typeof folio !== 'string' || !folio.trim() || folio.length > 200 || !guidance.has(stage)) {
    throw failure(400, 'Selecciona una ficha y una etapa de seguimiento.');
  }

  const {rows} = await db.query(
    'SELECT values_json FROM soac_m02.fichas WHERE folio = $1', [folio]);
  if (!rows.length) throw failure(404, 'Ficha no disponible.');
  if (blocksContact(rows[0].values_json)) {
    throw failure(409, 'La ficha está marcada como No contactar.');
  }

  return {draft: await generateDraft(stage, client)};
}

export async function generateDraft(stage, client) {
  if (!client && !process.env.OPENAI_API_KEY) {
    throw failure(503, 'La generación de borradores aún no está configurada.');
  }
  const openai = client ?? new OpenAI({timeout: 12000, maxRetries: 0});
  try {
    const response = await openai.responses.create({
      model: process.env.SOAC_M02_OPENAI_MODEL || 'gpt-4.1-mini',
      store: false,
      max_output_tokens: 250,
      instructions: 'Redacta únicamente un mensaje breve y cordial de WhatsApp en español de México. Saluda de parte de Automotriz CLASA. Evita inventar nombres, fechas, condiciones o disponibilidad. Devuelve solo el texto del mensaje.',
      input: guidance.get(stage)
    });
    const draft = response.output_text?.trim();
    if (!draft || draft.length > 1500) throw Error('Invalid draft');
    return draft;
  } catch {
    throw failure(502, 'No se pudo preparar el borrador. Puedes redactarlo manualmente.');
  }
}

export function blocksContact(row) {
  return row.some(value => /\bno\s+contactar\b/i.test(String(value ?? '')));
}
