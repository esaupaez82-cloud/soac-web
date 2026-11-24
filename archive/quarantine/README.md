# Cuarentena de recuperación — SOAC® V4 Premium

**NO ES CONTENIDO PARA PUBLICAR.** Esta carpeta documenta el espacio previsto para respaldos de archivos que se demuestre que son sustituciones conflictivas, duplicados no usados o versiones defectuosas.

### Estado 24/11/2026
- **Ningún archivo activo ha sido movido, borrado o desactivado**. No hay recursos de clientes aquí.
- Se clasificaron **27 referencias** inicialmente en `docs/INVENTARIO_PRELIMINAR_CUARENTENA_SOAC_20261124.csv`.
- Las clasificaciones son preliminares y **deben validarse con mapa de dependencias, origen real del despliegue, checksum y pruebas**.
- Ruta oficial a recuperar: Premium original blanco, negro y rojo. M02 única entrada de clientes.
- Especificación Codex: `docs/CODEX_ORDEN_MAESTRA_RECUPERACION_Y_DEPURACION_20261124.md`.

### Reglas de desplazamiento hacia cuarentena
1. Identificar consumidor, dependencia y ruta ejecutada.
2. Respaldar bytes íntegros y registrar hash; nunca guardar tokens, INE ni datos reales.
3. Crear copia reversible bajo `archive/quarantine/<fecha>/<modulo>/` solo de código no activo o sustituido y sin datos sensibles.
4. Verificar módulo restaurado, redirecciones, tests y relectura.
5. Retirar únicamente referencias **después** de autorización, nunca borrar registros/respaldos.

Prohibido convertir una demo, una pantalla vacía o el proyecto Chevrolet en reemplazo de SOAC®.