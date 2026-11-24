# ORDEN INMEDIATA PARA CODEX — SOAC® V4 MAESTRO PREMIUM ORIGINAL
Fecha: 24 de noviembre de 2026. Automotriz CLASA®.
Estado: ORDEN DE EJECUCIÓN; NO es una constancia de restauración.
Prioridad máxima: recuperar el proyecto operativo auténtico y separar software obsoleto/conflictivo sin pérdida de datos ni sustituciones.

## 0. AUTORIZACIÓN Y LÍMITES INNEGOCIABLES
Actúa como ingeniero responsable de recuperación de software existente. Ejecuta trabajo real de código en la rama aislada `recovery/maestro-premium-original-20261122` del repositorio `esaupaez82-cloud/soac-web`. Si esa rama evoluciona, crea subrama de trabajo desde ella y documenta los commits; nunca trabajes directamente sobre `main`, producción ni dominios de clientes.

NO crear CRM nuevo, demo sustituta, maqueta, datos inventados en producción, sistema alternativo ni base paralela. NO borrar historial ni respaldos, cambiar nombres/URLs oficiales, ni conectar/desplegar al dominio operativo sin pruebas y autorización expresa. NO modificar el proyecto Chevrolet (totalmente independiente), la página institucional de CLASA®, WhatsApp Business, la fuente oficial Google Sheets ni la configuración de producción. Los tests usan datos ficticios aislados.

**Identidad visual auténtica obligatoria:** fondo blanco, encabezado negro, acentos rojos, gris y logotipo oficial CLASA®. NO usar la versión roja completa ni el panel oscuro como sustitutos; recuperar, comparar y respetar las pantallas originales.

## 1. FUENTES AUTÉNTICAS A INVESTIGAR Y CONTRASTAR
- Repositorio: https://github.com/esaupaez82-cloud/soac-web
- Rama base de trabajo y documentación: `recovery/maestro-premium-original-20261122`
- Rama rica en recuperación anterior: `fix/m02-preview-oauth-config-20261122` (SHA base `58111c369b49aaa2e68e90f28f71f5aabc90e7ac`)
- Otras ramas históricas de análisis: `recovery/vercel-portal-20261121`, `recovery/drive-originals-20261122`, `fix/centro-digital-source-recovery-20261121`, `fix/soac-operacion-20261121`. Comparar hashes/rutas; no sobrescribir por nombre.
- Despliegue histórico Vercel con árbol de fuentes: proyecto `soac-web-clasa-demo`, ID `prj_LdVEI6iztMeVxEvA0sJXEmFQAQC1`, despliegue `dpl_EXewMFgMnFgbK9Dr4aYAmwffQB35` (88 rutas incluidas rutas compiladas). Tratarlo como **fuente de recuperación**, no como sistema final que pueda sustituir al original. Recuperar íntegramente código fuente con integridad comprobada, no copiar resultados truncados de API.
- Ese árbol contiene `src/src/server.js`, `src/src/api/auth.js`, `src/src/lib/auth.js`, `src/src/lib/firebase-auth.js`, `src/src/public/firebase-login.js`, `src/src/public/premium.css`, `src/src/public/assets/logo-oficial-clasa.jpg`, `direccion-premium.html`, `inventario-premium.html`, `expediente-maestro.html`, `financiamiento-gestion-premium.html`, `pagos-cobranza-premium.html`, `preparacion-premium.html`, `reportes-premium.html`, `operacion-premium.html`, `soac-v4.html` y dependencias.
- Control oficial Google Sheets: https://docs.google.com/spreadsheets/d/1X-qOPULagTNcsT0rdA8Lp6Whm0qfcnvZ6sfmIv-zwLI/edit, pestaña `CENTRO_DIGITAL_SOAC`. Existe fuente de referencia; acceso mediante conector ChatGPT no demuestra autenticación de la página.
- Inventario verificado de recuperación 21 NOV: https://docs.google.com/document/d/1-LeKtgdw0jWBMyV0EDUoMFPnOCQKqPK6Gt9ZoNSLDDY/edit
- Respaldo integrado Premium 28 OCT (advierte falta de persistencia Apps Script): https://docs.google.com/document/d/1PHq30-CMJzloYKSGVo9girlZqd5ngsL8ShkdUaW8k08/edit
- Compra Inteligente HTML original: https://drive.google.com/file/d/1BIbjNOOcQFZI6z-zzB2NQ1Z4EF1BNOrR/view
- Financiamiento HTML original: https://drive.google.com/file/d/1bkF3jqeULUxjy0Fj80XpjXr4ZLEQ3bNe/view
- Código existente `src/recovered-originals/apps-script/CLASA_v6.gs`, `compra-flujo.gs`, `compra-portal.gs`, `compra-webapp.gs`; rescatar e inventariar como originales históricos, sin asumir ejecución en Vercel.
- Especificación previa de acceso único: `docs/ACCESO_UNICO_CENTRO_DIGITAL_M02.md`. Informe fuente: `docs/RECUPERACION_SOAC_PREMIUM_20261122.md`. Orden rastreable: https://github.com/esaupaez82-cloud/soac-web/issues/3

## 2. INVENTARIO FORENSE Y SEPARACIÓN DE LO QUE NO SIRVE
Antes de refactorizar, generar `docs/INVENTARIO_FUENTES_Y_CUARENTENA.csv` y `docs/MAPA_DEPENDENCIAS.md`. Analizar TODO el árbol GitHub, TODAS las ramas relevantes, el árbol desplegado Vercel, respaldos Drive y módulos referenciados. Registrar ruta, versión/fecha, hash o tamaño, origen, dependencia/consumidores, propósito, estado funcional, evidencia, riesgo y decisión.

**Clasificaciones obligatorias:**
- `OFICIAL_ACTIVO`: fuente única aprobada; protegida.
- `ORIGINAL_RECUPERABLE`: evidencia histórica auténtica; conservar hasta restauración y prueba.
- `DUPLICADO_VERIFICADO`: hash idéntico y no referenciado; candidato a archivo histórico, no borrar.
- `SUSTITUCION_CONFLICTIVA`: reemplazo visual o funcional del original (ej. CSS oscuro o redirección) que no puede hacerse fuente oficial.
- `ROTO_O_INCOMPLETO`: referencias faltantes, redirecciones vacías, shells sin backend, botón OAuth repetido, código que no guarda, configuración no habilitada; no declarar inútil hasta revisar dependencias.
- `LEGADO_SOLO_REFERENCIA`: Render antiguo, snapshots, demos, pruebas y publicaciones Buen Fin ya caducadas; conservar separados del código operativo.
- `SENSIBLE_O_SECRETO`: tokens, credenciales, documentos personales; nunca copiar a repositorio, logs ni archivos de cuarentena.

**Cuarentena técnica:** crear `archive/quarantine/` únicamente para COPIAS de material recuperado/no activo, con índice y justificación; nunca mover/borrar rutas originales antes de demostrar que la sustitución corregida funciona y no hay dependencias. Si hay alias o rutas aún utilizadas, mantener compatibilidad con redirecciones verificadas después de restaurar la pantalla real. Material que aún se esté usando se marca `CONFLICTIVO_EN_USO` y se conserva hasta el reemplazo probado.

**Reglas para depuración:** no borrar 1) hojas/fichas/folios, 2) fuente Apps Script V6, 3) HTML auténtico, 4) respaldos ni historial, 5) módulos sin prueba de equivalencia, 6) archivos Vercel que no estén íntegramente recuperados. No aplicar 'clean sweep' ni reescritura general. No mezclar proyectos.

**Hallazgos confirmados de partida:**
- `src/public/centro-digital-premium.html` es una redirección meta-refresh a `/modulo-02.html`, NO la pantalla Premium completa.
- `src/public/modulo-02.html` es un shell pequeño que incluye Google GIS y scripts de portal, NO acredita por sí mismo el formulario original.
- `src/public/soac-portal.css` comienza con `color-scheme:dark` y `--bg:#0c1016`, contrario a la identidad requerida; no borrar hasta reemplazar probadamente.
- Fuente histórica `premium.css` en Vercel define `color-scheme:light`, `--clasa-red:#FA0001`, `--clasa-black:#050505`, `--clasa-white:#fff`. Recuperar CSS exacto y comprobar su aplicación.
- Existen duplicados `public/` y `src/public/` que requieren determinar raíz servida real; tamaños iguales NO garantizan equivalencia funcional.
- HTML Compra Premium (~130 KB) y Financiamiento Premium (~392 KB) están presentes, pero su guardado/Apps Script no está certificado.
- Parte del backend real (server, auth, DB, API) se ve en fuentes de Vercel pero NO está íntegramente en la rama actual.
- Firebase/OAuth histórico implementa rutas de sesión; en metadatos Vercel del proyecto revisado `SOAC_AUTH_PROVIDER` figuraba para preview, no producción. No inferir que la sesión real ya opera.
- Los tests con mocks de M02 pasaron en GitHub Actions; NO son prueba de autenticación ni escritura web real.

## 3. RESTAURAR MÓDULOS, SIN VACÍOS NI APARIENCIAS DE ÉXITO
Priorizar recuperación por interdependencia:
1. PORTAL: identidad Premium original, menú, accesos, rutas, logo, páginas internas, control de acceso.
2. M02 CENTRO DIGITAL — **única puerta de entrada y seguimiento de clientes**: ficha única, folio, deduplicación, teléfono/WhatsApp, origen, vehículo, interés, compra/contado/financiamiento/toma a cuenta/solo venta, etapa, responsable, próxima acción, citas, expedientes y bitácora. No crear CRM alterno.
3. M03 INVENTARIO: catálogo, fotos oficiales, VIN/REPUVE, estado disponible/apartado/vendido, precios, publicación, trazabilidad y semáforo 30/60/90; jamás reactivar automáticamente vendidos.
4. M04 COMPRA INTELIGENTE: propuesta, compra directa, toma a cuenta, consignación, cotizador y expediente propietario. Respetar estructura original.
5. M05 COTIZADOR V6: archivos `CLASA_v6.gs`, propuestas, parámetros y generación documental. No sustituir por calculadora sin respaldo.
6. M07 FINANCIAMIENTO: financiera, validación, viable ≠ aprobado, token nunca almacenado, documentos faltantes y etapas verificadas.
7. M06 EXPEDIENTE MAESTRO: archivos enlazados, permisos por ficha, identidad cliente/vehículo/operación, sin exposición de INE/CFDI.
8. M01 DIRECCIÓN, M08 PAGOS/COBRANZA Y RECIBOS, M09 PREPARACIÓN, M10 REPORTES, M11 RH y cualquier módulo históricamente oficial comprobado. Integrar sin confundir módulos visibles con backend.
9. CALENDARIO/CITAS, contratos, entregas, reportes e integraciones: conservar funcionamiento y enlazar mediante M02, no crear capturas paralelas.

Para CADA módulo: recuperar fuente auténtica, reparar las dependencias mínimas, iniciar en aislamiento, comprobar navegación, render real, permisos, acción central, guardado y relectura, estados de error, evidencia en captura y listado de fallos. Etiquetar: `FUENTE_LOCALIZADA` / `PANTALLA_RESTAURADA` / `FUNCION_VERIFICADA` / `NO_CUMPLE`. Nunca etiquetar 'listo' solo por HTTP 200, tests con mocks o vista bonita.

## 4. SOLUCIONAR DE UNA VEZ LA DOBLE AUTORIZACIÓN GOOGLE
Decisión aprobada: NO pedir 'Conectar Google' repetidamente después del inicio de sesión SOAC®. Hoy `soac-portal.js` construye el botón, usa `accessToken` de memoria y fuerza `requestAccessToken({prompt:'consent'})`. Reutilizar la sesión segura existente o recuperar correctamente la arquitectura histórica autenticada; acceso a Sheets desde backend bajo la identidad/permisos autorizados, sesiones por usuario con vencimiento y cierre de sesión. No crear claves compartidas en frontend ni abrir datos públicamente. Mantener protección anti-CSRF/autorización para escrituras y verificación post-guardado.

**No retirar botón/flujo anterior hasta que la vía autenticada alternativa pase pruebas**; una vez probada, eliminar del uso normal la autorización duplicada. Si la sesión expira o el usuario no tiene permisos, solicitar inicio de sesión seguro, nunca mostrar datos sin permiso.

## 5. PRUEBAS OBLIGATORIAS ANTES DE PROPONER PUBLICAR
- Integridad de fuentes/hashes y rutas; JS/HTML/CSS/Apps Script; CI.
- Capturas auténticas comparando Premium blanco/negro/rojo contra sustitución oscura; móvil y escritorio.
- Autenticación de sesión SOAC, reentrada a M02, navegación y recarga sin popup de Google redundante; expiración, revocación, cuenta equivocada y permisos denegados.
- M02 crear/procesar **únicamente fichas FICTICIAS en sandbox/hoja temporal aislada**, folio único, deduplicación, lectura/escritura/relectura, no sobrescribir concurrente; real M02 en modo de lectura hasta test aprobado.
- Formularios y guardado real para módulos; no atribuir a Google Sheets, PDFs, WhatsApp, Gmail, Vercel ni Zoho acciones sin constancia.
- Reglas de negocio: cita primero, viable no significa aprobado, no duplicar solicitudes de INE, unidad vendida no disponible, no mezclar Chevrolet.
- Ningún secreto, dato real, token o documento personal en capturas, logs, repositorios ni previews.
- Preview privado aislado; no mover dominios, producción, aliases o datos de clientes.

## 6. ENTREGABLES Y ORDEN DE EJECUCIÓN
**EMPEZAR AHORA, sin esperar nueva especificación ni pedir que el usuario gestione código.**
A. Auditar ramas y fuentes, generar mapa de rutas/dependencias y clasificación con evidencias.
B. Recuperar el backend histórico completo (si API limita tamaño, usar ruta de origen íntegro o descarga autenticada; no reconstruir a partir de base64 truncado).
C. Restaurar portal Premium y M02 en una rama aislada; demostrar visual y sesión única.
D. Recuperar por bloques M03/M04/M05/M07/M06 y luego M01/M08/M09/M10/M11, con commits pequeños reversibles.
E. Ejecutar tests y preview autenticado aislado. Registrar cada módulo como aprobado o pendiente con prueba exacta.
F. Mostrar captura real y tabla final: archivo original | duplicado/roto | acción | commit | prueba | destino | pendiente.
G. Abrir PR de revisión cuando esté probado. NO fusionar/activar producción sin autorización expresa.

**Entregar no solo instrucciones**: generar commits verificables, enlace al preview si fue realmente creado, capturas y reporte con lista de errores y reparaciones. En caso de bloqueo, continuar en otras partes sin poner en riesgo datos reales; distinguir trabajo hecho, pendiente y bloqueado.

## 7. PROHIBICIONES EXPRESAS
NO migraciones de datos reales, NO borrar fuentes, NO sustituir con `soac-web-clasa-demo` como producto final, NO hacer `git push --force`, NO reescribir `main`, NO mover dominio institucional `automotriz-clasa-sitio-publico.vercel.app`, NO tocar Chevrolet ni sus datos, NO declarar que Codex ejecutó o que M02 guarda si no existe prueba real.

## 8. CRITERIO DE TERMINACIÓN
SOAC® V4 Maestro Premium original visualmente correcto, módulos con flujos reales verificados, un solo acceso seguro, M02 como único ingreso de clientes, fuente oficial preservada, código conflictivo separado con trazabilidad y restauración reversible, errores documentados, capturas y pruebas por módulo. Cualquier excepción requiere dejarla visible como pendiente; no fingir que 'ya está'.
