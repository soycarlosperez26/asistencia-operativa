/**
 * Nombre de la compañía. Único lugar para cambiarlo — se usa en el título de la
 * app, el login, el encabezado y los carnets QR de los trabajadores.
 */
export const COMPANY_NAME = "Mantenimiento, Suministros e Insumos";

/** Ruta del logo (en /public), usado en el login, el header y los carnets QR. */
export const COMPANY_LOGO = "/logo.jpeg";

export const APP_NAME = `Registro Operativo - ${COMPANY_NAME}`;

/** Minutos que se considera válida una lectura de GPS antes de volver a pedirla. */
export const GPS_CACHE_MINUTES = 9;

/**
 * Funcionalidad premium, oculta por ahora: no se pide ni se muestra el GPS
 * al registrar asistencia. Cambiar a `true` cuando se habilite el plan que
 * incluye geolocalización.
 */
export const GPS_ENABLED = false;
