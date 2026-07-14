/**
 * Colombia no tiene horario de verano — es UTC-5 todo el año, siempre. Todo
 * cálculo de fecha/hora del lado del servidor debe anclarse a esta zona en
 * vez de depender de la del proceso: en local eso suele ser la del sistema
 * operativo (Colombia), pero en Vercel las funciones corren en UTC — mismo
 * timestamp, "hoy" y horas mostradas distintas según dónde corra el código.
 * Por eso todo lo que antes usaba Date.getHours/getDate/setHours/etc.
 * (locales, dependientes del proceso) o toLocaleString sin `timeZone` queda
 * migrado a estos helpers.
 */

export const BOGOTA_TIME_ZONE = "America/Bogota";
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-5

/**
 * Instante cuyos métodos getUTC.../setUTC... devuelven la hora de pared de
 * Bogotá para `date` — permite hacer aritmética de calendario "en Bogotá"
 * usando solo métodos UTC, que no dependen de la zona horaria del proceso.
 */
export function toBogotaWallClock(date: Date): Date {
  return new Date(date.getTime() - BOGOTA_OFFSET_MS);
}

/** Inverso de `toBogotaWallClock`: vuelve del instante "hora de pared" al instante UTC real. */
function fromBogotaWallClock(wallClock: Date): Date {
  return new Date(wallClock.getTime() + BOGOTA_OFFSET_MS);
}

/** Fecha calendario ("YYYY-MM-DD") en hora de Bogotá para un instante dado. */
export function bogotaDateKey(date: Date): string {
  return toBogotaWallClock(date).toISOString().slice(0, 10);
}

function parseDateKey(dateKey: string): [number, number, number] {
  const [year, month, day] = dateKey.split("-").map(Number);
  return [year, month - 1, day];
}

/** Instante UTC real de las 00:00:00.000 hora de Bogotá para la fecha "YYYY-MM-DD". */
export function bogotaMidnightUTC(dateKey: string): Date {
  const [year, month, day] = parseDateKey(dateKey);
  return fromBogotaWallClock(new Date(Date.UTC(year, month, day, 0, 0, 0, 0)));
}

/** Instante UTC real de las 23:59:59.999 hora de Bogotá para la fecha "YYYY-MM-DD". */
export function bogotaEndOfDayUTC(dateKey: string): Date {
  const [year, month, day] = parseDateKey(dateKey);
  return fromBogotaWallClock(new Date(Date.UTC(year, month, day, 23, 59, 59, 999)));
}

/** Fecha "YYYY-MM-DD" de hoy, en hora de Bogotá. */
export function todayBogotaISODate(): string {
  return bogotaDateKey(new Date());
}

/** Fecha "YYYY-MM-DD" de hace `days` días, en hora de Bogotá. */
export function daysAgoBogotaISODate(days: number): string {
  const wall = toBogotaWallClock(new Date());
  wall.setUTCDate(wall.getUTCDate() - days);
  return wall.toISOString().slice(0, 10);
}

/** Instante UTC real (ISO) de la medianoche de hoy en hora de Bogotá. */
export function startOfTodayBogotaISO(): string {
  return bogotaMidnightUTC(todayBogotaISODate()).toISOString();
}
