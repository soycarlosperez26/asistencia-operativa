import type { AttendanceRecordWithRelations } from "@/lib/types";
import { isFestivo } from "@/lib/colombianHolidays";

/**
 * Jornada estándar usada para calcular horas extra diurnas (HED).
 * Asunción provisional: el cliente todavía no definió reglas de horario,
 * tolerancia ni jornada oficial (ver specs_002.md sección 5). Ajustar acá
 * cuando se confirmen las reglas reales.
 */
export const STANDARD_WORKDAY_HOURS = 8;

/** Franja nocturna: 19:00–06:00 (Ley 2101 de 2021, vigente desde jul-2025). */
export const NIGHT_START_HOUR = 19;
export const NIGHT_END_HOUR = 6;

export interface WorkedHoursRow {
  key: string;
  workerId: string;
  workerName: string;
  documentId: string;
  projectName: string;
  /** Fecha (yyyy-mm-dd) de la entrada de esta jornada. */
  date: string;
  entradaAt: string;
  salidaAt: string | null;
  hoursWorked: number | null;
  overtimeDay: number | null;
  /** Horas de la jornada dentro de la franja nocturna (19:00–06:00). */
  nightHours: number | null;
  /** Domingo o festivo colombiano, tomando la fecha de entrada como referencia. */
  isHoliday: boolean;
  /** Total de horas trabajadas si `isHoliday`, 0 en caso contrario. */
  holidayHours: number | null;
  hasCheckout: boolean;
}

function toDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Minutos de [start, end) que caen dentro de la franja nocturna (19:00–06:00). */
export function nightMinutesBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let total = 0;
  let cursor = start;

  while (cursor < end) {
    const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const nightEndToday = new Date(dayStart);
    nightEndToday.setHours(NIGHT_END_HOUR, 0, 0, 0);
    const nightStartToday = new Date(dayStart);
    nightStartToday.setHours(NIGHT_START_HOUR, 0, 0, 0);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    const segEnd = end < nextDayStart ? end : nextDayStart;

    const morningStart = cursor > dayStart ? cursor : dayStart;
    const morningEnd = segEnd < nightEndToday ? segEnd : nightEndToday;
    if (morningEnd > morningStart) {
      total += (morningEnd.getTime() - morningStart.getTime()) / 60_000;
    }

    const eveningStart = cursor > nightStartToday ? cursor : nightStartToday;
    const eveningEnd = segEnd;
    if (eveningEnd > eveningStart) {
      total += (eveningEnd.getTime() - eveningStart.getTime()) / 60_000;
    }

    cursor = segEnd;
  }

  return total;
}

/**
 * Empareja entrada/salida por trabajador (en orden cronológico, alternan
 * porque el sistema ya fuerza esa alternancia al registrar asistencia) y
 * calcula horas trabajadas + horas extra diurnas por jornada.
 */
export function buildWorkedHoursReport(
  records: AttendanceRecordWithRelations[]
): WorkedHoursRow[] {
  const byWorker = new Map<string, AttendanceRecordWithRelations[]>();
  for (const record of records) {
    const list = byWorker.get(record.worker_id) ?? [];
    list.push(record);
    byWorker.set(record.worker_id, list);
  }

  const rows: WorkedHoursRow[] = [];

  const pushUnmatched = (entrada: AttendanceRecordWithRelations) => {
    rows.push({
      key: entrada.id,
      workerId: entrada.worker_id,
      workerName: entrada.worker.full_name,
      documentId: entrada.worker.document_id,
      projectName: entrada.project.name,
      date: toDateKey(entrada.recorded_at),
      entradaAt: entrada.recorded_at,
      salidaAt: null,
      hoursWorked: null,
      overtimeDay: null,
      nightHours: null,
      isHoliday: isFestivo(new Date(entrada.recorded_at)),
      holidayHours: null,
      hasCheckout: false,
    });
  };

  for (const workerRecords of byWorker.values()) {
    const sorted = [...workerRecords].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    let open: AttendanceRecordWithRelations | null = null;

    for (const record of sorted) {
      if (record.type === "entrada") {
        if (open) pushUnmatched(open);
        open = record;
        continue;
      }

      // "salida" sin "entrada" abierta: la entrada quedó fuera del rango
      // filtrado. No hay forma de atribuirla a una jornada, se omite.
      if (!open) continue;

      const entradaDate = new Date(open.recorded_at);
      const salidaDate = new Date(record.recorded_at);

      const hoursWorked = round2(
        (salidaDate.getTime() - entradaDate.getTime()) / 3_600_000
      );
      const overtimeDay = round2(Math.max(0, hoursWorked - STANDARD_WORKDAY_HOURS));
      const nightHours = round2(nightMinutesBetween(entradaDate, salidaDate) / 60);
      const isHoliday = isFestivo(entradaDate);
      const holidayHours = isHoliday ? hoursWorked : 0;

      rows.push({
        key: open.id,
        workerId: open.worker_id,
        workerName: open.worker.full_name,
        documentId: open.worker.document_id,
        projectName: open.project.name,
        date: toDateKey(open.recorded_at),
        entradaAt: open.recorded_at,
        salidaAt: record.recorded_at,
        hoursWorked,
        overtimeDay,
        nightHours,
        isHoliday,
        holidayHours,
        hasCheckout: true,
      });
      open = null;
    }

    if (open) pushUnmatched(open);
  }

  return rows.sort((a, b) => {
    const nameCompare = a.workerName.localeCompare(b.workerName);
    return nameCompare !== 0 ? nameCompare : a.date.localeCompare(b.date);
  });
}

export interface WorkedHoursSummary {
  distinctWorkers: number;
  totalSessions: number;
  totalHoursWorked: number;
  totalOvertimeDay: number;
  missingCheckouts: number;
  avgHoursPerSession: number;
}

export function summarizeWorkedHours(rows: WorkedHoursRow[]): WorkedHoursSummary {
  const workerIds = new Set(rows.map((row) => row.workerId));
  const completed = rows.filter((row) => row.hasCheckout);

  const totalHoursWorked = round2(
    completed.reduce((sum, row) => sum + (row.hoursWorked ?? 0), 0)
  );
  const totalOvertimeDay = round2(
    completed.reduce((sum, row) => sum + (row.overtimeDay ?? 0), 0)
  );

  return {
    distinctWorkers: workerIds.size,
    totalSessions: rows.length,
    totalHoursWorked,
    totalOvertimeDay,
    missingCheckouts: rows.length - completed.length,
    avgHoursPerSession: completed.length
      ? round2(totalHoursWorked / completed.length)
      : 0,
  };
}

export function dateRangeBoundsISO(from: string, to: string) {
  return {
    startISO: new Date(`${from}T00:00:00`).toISOString(),
    endISO: new Date(`${to}T23:59:59.999`).toISOString(),
  };
}

export function formatReportTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatReportDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}
