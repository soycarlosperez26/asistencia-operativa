import type { AttendanceRecord, AttendanceType } from "@/lib/types";

/**
 * Minutos mínimos entre una "entrada" y la próxima "salida" del mismo
 * trabajador. Si se intenta marcar de nuevo antes de este umbral, el sistema
 * avisa que el trabajador ya se registró en vez de insertar la salida.
 */
export const MIN_MINUTES_BEFORE_CHECKOUT = 30;

/** Valor del selector de proyecto en /asistencia para ver todos a la vez. */
export const ALL_PROJECTS_VALUE = "all";

/** Inicio del día (00:00, hora del servidor) en ISO, para filtrar "hoy". */
export function startOfTodayISO(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/** Inicio del día (00:00, hora del cliente) en ISO, para filtrar "hoy". */
export function startOfTodayLocal(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toLocaleString();
}

/**
 * Cuenta trabajadores presentes: el último evento del día de cada
 * trabajador es 'entrada'.
 */
export function computePresentCount(
  records: Pick<AttendanceRecord, "worker_id" | "type" | "recorded_at">[]
): number {
  const latestByWorker = new Map<string, AttendanceType>();

  const sorted = [...records].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  for (const record of sorted) {
    latestByWorker.set(record.worker_id, record.type);
  }

  return [...latestByWorker.values()].filter((type) => type === "entrada").length;
}

/** Determina si el próximo evento de un trabajador es entrada o salida. */
export function nextAttendanceType(lastType: AttendanceType | null): AttendanceType {
  return lastType === "entrada" ? "salida" : "entrada";
}

/** Minutos transcurridos desde una marca de tiempo ISO hasta ahora. */
export function minutesSince(recordedAtISO: string): number {
  return (Date.now() - new Date(recordedAtISO).getTime()) / 60_000;
}
