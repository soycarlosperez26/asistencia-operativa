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

/** Ventana horaria diaria a descontar de las horas trabajadas (ej. almuerzo). */
export interface DeadTimeWindow {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

/** Convierte "HH:MM" o "HH:MM:SS" a {hour, minute}. */
export function parseTimeOfDay(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

function toDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Minutos de [start, end) que caen dentro de una ventana horaria diaria.
 * Soporta ventanas que no cruzan medianoche (ej. almuerzo 12:00–13:00) y
 * ventanas que sí cruzan medianoche (ej. franja nocturna 19:00–06:00).
 */
function minutesInDailyWindow(start: Date, end: Date, window: DeadTimeWindow): number {
  if (end <= start) return 0;
  let total = 0;
  let cursor = start;

  while (cursor < end) {
    const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const windowStartToday = new Date(dayStart);
    windowStartToday.setHours(window.startHour, window.startMinute, 0, 0);
    const windowEndToday = new Date(dayStart);
    windowEndToday.setHours(window.endHour, window.endMinute, 0, 0);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    const segEnd = end < nextDayStart ? end : nextDayStart;

    if (windowEndToday > windowStartToday) {
      // Ventana dentro del mismo día (ej. almuerzo).
      const overlapStart = cursor > windowStartToday ? cursor : windowStartToday;
      const overlapEnd = segEnd < windowEndToday ? segEnd : windowEndToday;
      if (overlapEnd > overlapStart) {
        total += (overlapEnd.getTime() - overlapStart.getTime()) / 60_000;
      }
    } else {
      // Ventana que cruza medianoche (ej. franja nocturna).
      const morningStart = cursor > dayStart ? cursor : dayStart;
      const morningEnd = segEnd < windowEndToday ? segEnd : windowEndToday;
      if (morningEnd > morningStart) {
        total += (morningEnd.getTime() - morningStart.getTime()) / 60_000;
      }

      const eveningStart = cursor > windowStartToday ? cursor : windowStartToday;
      const eveningEnd = segEnd;
      if (eveningEnd > eveningStart) {
        total += (eveningEnd.getTime() - eveningStart.getTime()) / 60_000;
      }
    }

    cursor = segEnd;
  }

  return total;
}

/** Minutos de [start, end) que caen dentro de la franja nocturna (19:00–06:00). */
export function nightMinutesBetween(start: Date, end: Date): number {
  return minutesInDailyWindow(start, end, {
    startHour: NIGHT_START_HOUR,
    startMinute: 0,
    endHour: NIGHT_END_HOUR,
    endMinute: 0,
  });
}

/**
 * Minutos de [start, end) que caen dentro de cualquiera de las ventanas de
 * "hora muerta" (ej. almuerzo). Para descontar otro horario muerto a futuro,
 * alcanza con agregar otra ventana a la lista — no hace falta tocar esta
 * función.
 */
export function deadTimeMinutesBetween(start: Date, end: Date, windows: DeadTimeWindow[]): number {
  return windows.reduce((sum, window) => sum + minutesInDailyWindow(start, end, window), 0);
}

/**
 * Empareja entrada/salida por trabajador (en orden cronológico, alternan
 * porque el sistema ya fuerza esa alternancia al registrar asistencia) y
 * calcula horas trabajadas + horas extra diurnas por jornada.
 *
 * `getDeadTimeWindows` resuelve las ventanas de hora muerta (ej. almuerzo)
 * aplicables a la fecha de una jornada — puede variar por año porque el
 * horario de almuerzo es parametrizable (ver lib/legalParameters.ts). Si no
 * se pasa, no se descuenta ninguna hora muerta (comportamiento de nómina,
 * que calcula sus propias categorías por separado).
 */
export function buildWorkedHoursReport(
  records: AttendanceRecordWithRelations[],
  getDeadTimeWindows?: (date: Date) => DeadTimeWindow[]
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

      const rawHours = (salidaDate.getTime() - entradaDate.getTime()) / 3_600_000;
      const deadWindows = getDeadTimeWindows?.(entradaDate) ?? [];
      const deadHours = round2(deadTimeMinutesBetween(entradaDate, salidaDate, deadWindows) / 60);
      const hoursWorked = round2(Math.max(0, rawHours - deadHours));
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
