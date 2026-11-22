# SOAC® V4 Maestro Premium — Auditoría de recuperación (22/11/2026)
**Estado:** inventario de fuentes verificado; restauración visual de Centro Digital M02 y persistencia web pendientes.
**Alcance:** recuperación de sistema original, sin sustitución por demo ni CRM nuevo.
**Rama aislada de trabajo:** `recovery/maestro-premium-original-20261122`.
**Orden operativa:** https://github.com/esaupaez82-cloud/soac-web/issues/3

## Fuentes existentes y preservadas
| Elemento | Fuente verificable | Hallazgo | Certificación |
| --- | --- | --- | --- |
| Núcleo SOAC® | `main` SHA `849a37aa0cec3550c6d9cff8bd6228c66cc2ee67` | Core y recuperación, sin todo el portal | Parcial |
| Fuente más completa en GitHub | `fix/m02-preview-oauth-config-20261122` SHA `58111c369b49aaa2e68e90f28f71f5aabc90e7ac` | HTML de Compra/Financiamiento, Apps Script y scripts de M02 | Código hallado; no significa funcional |
| Pantalla Centro Digital Premium | `src/public/centro-digital-premium.html` | Solo redirige a `/modulo-02.html` | NO restaurada |
| M02 actual | `src/public/modulo-02.html` + `soac-portal.js` + `soac-m02-editor.js` | Lectura y edición de ficha existente con pre/postverificación en código | Funciones end-to-end NO certificadas |
| Diseño original | Vercel deployment `dpl_EXewMFgMnFgbK9Dr4aYAmwffQB35`, `src/src/public/premium.css` | `color-scheme:light`; negro `#050505`; rojo `#FA0001`; blanco y logo oficial | Recuperación íntegra de CSS pendiente; respuesta API parcial/truncada |
| Módulos originales | Mismo despliegue Vercel | `direccion-premium.html`, `inventario-premium.html`, `expediente-maestro.html`, `financiamiento-gestion-premium.html`, `pagos-cobranza-premium.html`, `preparacion-premium.html`, `reportes-premium.html`, `soac-v4.html` y otros | Árbol hallado; verificar fuentes completas, hashes y pantallas |
| Fuente de datos oficial | Google Sheets ID `1X-qOPULagTNcsT0rdA8Lp6Whm0qfcnvZ6sfmIv-zwLI` | `CENTRO_DIGITAL_SOAC` tiene 498 filas × 27 columnas según metadata | Sin prueba end-to-end desde navegador |
| Historial | Drive “Inventario de recuperación y conexiones — 21 NOV 2026” | Documenta resguardos, limitaciones y prueba aislada del conector Sheets | No confundir conectividad de conector con la persistencia web |

## Evidencia automática existente
- Regresión M02, PASS: https://github.com/esaupaez82-cloud/soac-web/actions/runs/45057522286
- Certificación técnica con simulación sin datos reales, PASS: https://github.com/esaupaez82-cloud/soac-web/actions/runs/45057517954
- Smoke de OAuth sin autenticación, PASS en revisión previa: https://github.com/esaupaez82-cloud/soac-web/actions/runs/45057445734

**Estas pruebas no constituyen prueba autenticada de escritura o generación de folio en la web.**

## Criterios siguientes
1. Recobrar **el HTML y CSS exactos, no una recreación**, de Centro Digital Premium con fondo blanco, encabezado negro, acentos rojos y logo oficial. Registrar longitud/hash, fecha, ruta y captura auténtica de cada origen.
2. Inventariar y recuperar las rutas originales de los módulos faltantes, sin reemplazar ninguna por páginas vacías.
3. Mantener M02 como única entrada operativa de clientes. No permitir altas nuevas hasta certificar folio y deduplicación.
4. Probar navegación y formularios con datos ficticios, en destino aislado. En OAuth y persistencia: autorizar, escribir, volver a leer, verificar, sin tocar datos reales.
5. Entregar captura y pruebas por pantalla; distinguir claramente **fuente encontrada**, **pantalla recuperada** y **función certificada**.

**Protecciones:** no tocar producción, alias ni dominios; no modificar ni borrar respaldos; no usar datos personales reales; no alterar proyecto Chevrolet; no hacer merge sin pruebas.
