import { toBogotaWallClock } from "@/lib/timezone";

/**
 * Festivos de Colombia por año — necesarios para clasificar "hora festiva"
 * en el motor de nómina (ver lib/payroll.ts). Se calculan, no se cargan a
 * mano: fijos + Ley Emiliani (se corren al lunes siguiente) + móviles según
 * el Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario
 * gregoriano).
 *
 * Todo el calendario se construye y compara en UTC (Date.UTC/getUTC*) para
 * que sea 100% independiente de la zona horaria del proceso — no representa
 * un instante real, solo fechas de calendario. `isFestivo`, que sí recibe un
 * timestamp real de una marcación, se encarga de convertirlo primero a hora
 * de pared de Bogotá (ver lib/timezone.ts) antes de comparar contra este
 * calendario.
 */

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Ley Emiliani: si el festivo no cae en lunes, se traslada al siguiente lunes. */
function toEmilianiMonday(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0 = domingo, 1 = lunes
  if (dayOfWeek === 1) return date;
  const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
  return addDays(date, dayOfWeek === 0 ? 1 : daysUntilMonday);
}

function dateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

const cache = new Map<number, Set<string>>();

export function getColombianHolidays(year: number): Set<string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const fixed = [
    new Date(Date.UTC(year, 0, 1)), // Año Nuevo
    new Date(Date.UTC(year, 4, 1)), // Día del Trabajo
    new Date(Date.UTC(year, 6, 20)), // Independencia
    new Date(Date.UTC(year, 7, 7)), // Batalla de Boyacá
    new Date(Date.UTC(year, 11, 8)), // Inmaculada Concepción
    new Date(Date.UTC(year, 11, 25)), // Navidad
  ];

  const emiliani = [
    new Date(Date.UTC(year, 0, 6)), // Reyes Magos
    new Date(Date.UTC(year, 2, 19)), // San José
    addDays(easter, 39), // Ascensión del Señor
    addDays(easter, 60), // Corpus Christi
    addDays(easter, 68), // Sagrado Corazón
    new Date(Date.UTC(year, 5, 29)), // San Pedro y San Pablo
    new Date(Date.UTC(year, 7, 15)), // Asunción de la Virgen
    new Date(Date.UTC(year, 9, 12)), // Día de la Raza
    new Date(Date.UTC(year, 10, 1)), // Todos los Santos
    new Date(Date.UTC(year, 10, 11)), // Independencia de Cartagena
  ].map(toEmilianiMonday);

  const holy = [addDays(easter, -3), addDays(easter, -2)]; // Jueves y Viernes Santo

  const all = new Set<string>(
    [...fixed, ...emiliani, ...holy].map((date) => dateKey(date))
  );
  cache.set(year, all);
  return all;
}

export function isColombianHoliday(date: Date): boolean {
  return getColombianHolidays(date.getUTCFullYear()).has(dateKey(date));
}

/**
 * Domingo o festivo — la app trata ambos como "día festivo" para nómina.
 * `date` es un timestamp real (ej. `recorded_at` de una marcación): se
 * convierte a hora de pared de Bogotá antes de clasificar, para que el día
 * de la semana/festivo no dependa de la zona horaria del proceso.
 */
export function isFestivo(date: Date): boolean {
  const bogota = toBogotaWallClock(date);
  return bogota.getUTCDay() === 0 || isColombianHoliday(bogota);
}
