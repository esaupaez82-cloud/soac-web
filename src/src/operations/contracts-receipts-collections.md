# SOAC® V4 — Contratos, recibos y alertas de cobranza
Estado: especificación operativa, NO IMPLEMENTADO NI ACTIVADO. Fecha: 2026-11-21.
Empresa: Automotriz CLASA®.

## Alcance
- Reutilizar M06 Expediente Maestro para contratos, anexos y pagarés.
- Reutilizar M07 Pagos y Cobranza para recibos, calendario de vencimientos, conciliación y alertas.
- No crear un CRM, base de clientes o módulo comercial paralelo. Enlazar folios CUSTOMER, VEHICLE y DEAL existentes.
- Incorporar cobranza externa gradualmente con validación de saldos, contratos y pagos históricos.

## Reglas de vencimiento
- Alertas previas al vencimiento: pendientes de parametrizar según calendario contractual.
- En vencimiento: verificar pago y conciliación.
- Desde el primer día posterior a la fecha de vencimiento: marcar incidencia.
- Recargo: 10% del importe del pagaré afectado, una sola vez por incidencia, exclusivamente si la cláusula contractual aplicable lo permite y se ha validado su legalidad. No aplicar 10% diario, no aplicar sobre el saldo total, no capitalizar.
- Separar importe del pagaré, cargo por mora, abonos y saldo; guardar evidencia y trazabilidad.
- No emitir reclamos automáticos ni mensajes que presenten recargos no verificados como deuda exigible.

## WhatsApp
- Generar borrador con número y mensaje para revisión/envío autorizado.
- Respetar NO CONTACTAR y evitar duplicados; no leer chats ni alterar WhatsApp Business.
- Mensajes de recordatorio previos no deben afirmar impago sin conciliación.

## Recibos
- Folio inmutable, fecha, cliente, operación, vehículo, concepto, importe, método de pago, responsable y evidencia.
- Transferencia recibida por WhatsApp = comprobante pendiente de conciliación, no pago confirmado.
- Acuse de documentos y orden de gestoría son documentos distintos al recibo de pago.

## Condiciones de salida a producción
- Recuperación completa del código, autenticación Firebase y permisos por rol probados.
- Pruebas con datos no productivos de cálculo, alertas, duplicados, relectura y revocación.
- Aprobación del formato de recibo y revisión jurídica de la cláusula de mora.
