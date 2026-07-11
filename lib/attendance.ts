import type { AttendanceRecord, AttendanceType } from "@/lib/types";

/** Inicio del día (00:00, hora del servidor) en ISO, para filtrar "hoy". */
export function startOfTodayISO(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
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
