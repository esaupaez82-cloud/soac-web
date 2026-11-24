# Evidencia de recuperación parcial — 24/11/2026
Estado: FUENTES RECUPERADAS; NO certifica operación ni despliegue.
## Recuperación material
Origen: Vercel dpl_EXewMFgMnFgbK9Dr4aYAmwffQB35. Se conservan fuentes completas en src/recovered-originals/vercel-20261121/ sin activarlas. Relectura GitHub en base64 idéntica al origen Vercel en los tres casos.

| Ruta relativa | UID Vercel | Commit | Blob GitHub |
|---|---|---|---|
| db/003_audit_immutable.sql | abdd10ff718b6ac32f513f22509aaa2eaae3d8f7 | 8bc0c9421a70a864a09caab641e2e9b390d4ecf3 | 2abd675f5d42d143839f82cf0356f941b57010b7 |
| public/firebase-login.html | fe231079b326d99788120fa56213679bc2e162ee | 15675495dba438ac6b9c168bfc69ab7ffd7c2c33 | 7835005451a2c3f50c627ff777d584771972cd02 |
| public/firebase-login.css | 8cad452aefded3c8548266239d8014e0bfa173fd | d87e79e3eff4a6335182cc43edc24621d9eea295 | e8b9688421ea01c1870e87d7e2b420a77e9f94db |

El CSS de login histórico es oscuro; NO sustituye premium.css ni acredita identidad visual del portal. SQL histórico NO ejecutado.
## Bloqueos comprobados
- src/server.js y src/public/premium.css devolvieron 404 en rama base y en recovery/vercel-portal-20261121, recovery/drive-originals-20261122, fix/centro-digital-source-recovery-20261121, fix/m02-preview-oauth-config-20261122 y fix/soac-operacion-20261121. No equivale a ausencia en todo el historial.
- El árbol Vercel histórico contiene ambas fuentes, pero el conector entrega base64 truncado. También truncó firebase-login.js, db/migrate.js, lib/db.js, db/001_direccion.sql y vercel.json. No se copiaron fragmentos.
- En rama base, src/public/centro-digital-premium.html es meta-refresh a modulo-02.html; src/public/modulo-02.html usa soac-portal.css, Google GIS, soac-portal.js y soac-m02-editor.js. La página centro-digital-original.html del despliegue histórico también redirige; no es evidencia de una pantalla completa.
- soac-portal.js solicita prompt:'consent', token en memoria y llama a Sheets desde navegador. Se conserva hasta comprobar alternativa autenticada. El alta de nuevas fichas está bloqueada según texto de interfaz.
- src/package.json referencia server.js ausente en ruta comprobada; no se ejecutó servidor ni suite. El endpoint health existente declara certified:false.
- Control Operativo Oficial y respaldos Drive localizados por metadatos; no se modificaron.
## Siguiente condición de recuperación
Obtener bytes íntegros de server.js, premium.css y dependencias desde historial Git o descarga autenticada; comprobar raíz servida y rutas. Integrar sesión backend y permisos, prueba aislada de lectura/escritura/relectura con datos ficticios, y capturas reales. Mantener M02 como única entrada de clientes.
## Seguridad
No se sustituyeron rutas activas, no se movieron archivos, no se ejecutaron migraciones ni se solicitó despliegue, ni se modificaron hojas, dominios, Chevrolet o sitio institucional. No se verificó si los commits provocaron CI/preview automático. No hay módulo certificado ni capturas de sistema restaurado.
