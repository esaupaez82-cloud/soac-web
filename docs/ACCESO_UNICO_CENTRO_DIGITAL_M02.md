# DECISIÓN APROBADA — Acceso único a Centro Digital M02

**Fecha:** 22 noviembre 2026
**Estado:** **APROBADO COMO REQUISITO, NO IMPLEMENTADO NI CERTIFICADO**
**Sistema:** SOAC® V4 Maestro Premium ORIGINAL de Automotriz CLASA®
**Orden rectora:** https://github.com/esaupaez82-cloud/soac-web/issues/3

## Decisión del responsable
«Si ya estamos entrando con todo esto protegido, esa autorización ya no debe estar».

**Requisito de experiencia:** El usuario inicia sesión una sola vez en SOAC®. Al abrir Centro Digital M02 no debe pulsar «Conectar Google», autorizar de nuevo el acceso a la hoja, ni ver el selector de cuentas repetidamente mientras conserva una sesión válida. Si la sesión expiró o fue revocada, debe realizar una reautenticación segura, no recibir datos sin permiso.

**No interpretar como autorización para acceso anónimo, abrir Google Sheets al público ni deshabilitar permisos individuales**.

## Evidencia de la causa en el código actual
- `src/public/soac-portal.js`: línea 9 `accessToken=null` de memoria, no una sesión persistente.
- Líneas 27 y 44: botón «Conectar Google y cargar datos» y evento `click`.
- Líneas 50–59: `connectGoogle()` fuerza `requestAccessToken({prompt:'consent'})` en cada conexión.
- Líneas 61–70: `loadData()` lee directamente Sheets con un bearer token del navegador.
- `src/public/soac-m02-editor.js`: actualización de fichas existentes usa ese token contra Sheets.
- El despliegue histórico Vercel `dpl_EXewMFgMnFgbK9Dr4aYAmwffQB35` contiene `src/src/api/auth.js`, `src/src/lib/auth.js`, `src/src/lib/firebase-auth.js` y `src/src/public/firebase-login.js`: existe una arquitectura de sesión individual anterior, **no recuperada íntegramente al repositorio**.
- `src/db/002_firebase_sessions.sql`: esquema `soac_v4.session_google_tokens` con token cifrado y vencimiento ligado a sesión; **su presencia no demuestra que se esté usando**.
- Metadatos Vercel examinados sin descifrar valores: `SOAC_AUTH_PROVIDER` aparece en el proyecto `soac-web-clasa-demo` para entorno **preview** y no para **production**. No asumir que el entorno operativo ya autentica correctamente.
- La conexión de Drive disponible en ChatGPT **no proporciona por sí sola una sesión web autenticada a SOAC®**.

## Implementación exigida a Codex
1. Recuperar **fielmente** servidor/sesiones/identidad del Premium original a rama aislada. Identificar su origen y estructura; no reemplazar por demo.
2. Verificar **servidor y entorno real**: cookie de sesión segura, usuarios autorizados, permiso M02, credenciales del servidor y acceso a Google Sheets. No cambiar configuración de producción hasta certificar alternativa.
3. Al entrar a M02, verificar la **sesión SOAC® ya existente**. Usar backend autenticado para leer/escribir la fuente oficial; no solicitar otro OAuth interactivo en cada apertura.
4. Conservar verificación de folio e identidad, escritura parcial con control de concurrencia, relectura post-guardado, bitácora, permisos y aislamiento de datos.
5. Eliminar botón y código de consentimiento repetitivo **solo cuando el flujo autenticado único funcione**. En sesión no autorizada, redirigir al inicio de sesión, mostrar error o denegar; nunca dejar la pantalla pública ni usar token compartido.
6. **No guardar tokens de acceso o refresh en localStorage, sessionStorage ni HTML**. Si se mantiene token servidor, cifrado y vinculado a sesión con vencimiento. Todas las escrituras requieren autorización y anti-CSRF.
7. Probar **apertura inicial, navegación, refresco, expiración/revocación, cambio de usuario, intento sin permisos, lectura y edición de una ficha ficticia existente, relectura, no duplicación de folio y persistencia**, en ambiente aislado.
8. Adjuntar evidencia y capturas reales del Centro Digital Premium blanco/negro/rojo, con logo oficial.
9. Prohibido tocar datos reales, modificar producción, alterar página institucional o proyecto Chevrolet.

## Criterio binario de aceptación
- [ ] Al abrir M02 con sesión SOAC® vigente, se cargan datos automáticamente **sin «Conectar Google»**.
- [ ] Al recargar la pestaña o regresar desde otra pantalla, no se solicita una segunda autorización.
- [ ] Sin sesión o permiso SOAC® válido, los datos privados siguen inaccesibles.
- [ ] Editar ficha ficticia existente conserva folio/identidad y confirma guardado mediante relectura.
- [ ] Errores de conexión no aparentan guardado exitoso.
- [ ] Pruebas y capturas autenticadas verificadas; liberación **solo con aprobación**.

**Situación al registrar este acuerdo:** requisito documentado; *botón y consentimiento siguen en el código actual*, por tanto NO afirmar que ya se eliminó.
