# SOAC® V4 — Política de acceso (propuesta para implementar y probar)
Estado: DISEÑO, NO ACTIVADO. Fecha: 2026-11-21.
Fuente única de clientes: CENTRO_DIGITAL_SOAC (M02).
No conceder permisos por la mera posesión de un enlace ni por ser editor de Google Sheets.

## Roles
- ADMIN: Esaú. Gestión de usuarios, roles, auditoría y módulos.
- OPERACIONES_TOTAL: Yanelli. Acceso operativo a módulos SOAC, sin administración de credenciales ni cambios de seguridad.
- GRUPO_LIMITADO: Grupo Automotriz CLASA. Acceso solo a módulos y acciones que apruebe el administrador; denegado por defecto.
- RH_ASISTENCIA: personal de lavado y futuros empleados. Solo su registro de asistencia y perfil; sin clientes, inventario financiero ni expedientes.
- DESACTIVADO: sin acceso.

## Requisitos de implementación
1. Identidad individual verificada por proveedor de autenticación existente; nunca guardar contraseñas en Sheets ni GitHub.
2. Autorización de cada petición en servidor; denegar por defecto y auditar accesos.
3. M02 lectura/escritura únicamente con permiso explícito, folio y deduplicación; relectura tras escritura.
4. Sesiones separadas, cierre de sesión y revocación.
5. RH: firma electrónica y asistencia pendientes de diseño y validación; no activarlos sin pruebas.
6. Pruebas de permisos positivos y negativos para cada rol antes de producción.
7. WhatsApp Business y Chevrolet fuera de alcance.
