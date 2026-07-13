import type { AttendanceRecordWithRelations } from "@/lib/types";

/**
 * Jornada estándar usada para calcular horas extra diurnas (HED).
 * Asunción provisional: el cliente todavía no definió reglas de horario,
 * tolerancia ni jornada oficial (ver specs_002.md sección 5). Ajustar acá
 * cuando se confirmen las reglas reales.
 */
export const STANDARD_WORKDAY_HOURS = 8;

export interface WorkedHoursRow {
  key: string;
  workerId: string;
  workerName: string;
  documentId: string;
  projectCode: string;
  projectName: string;
  /** Fecha (yyyy-mm-dd) de la entrada de esta jornada. */
  date: string;
  entradaAt: string;
  salidaAt: string | null;
  hoursWorked: number | null;
  overtimeDay: number | null;
  hasCheckout: boolean;
}

function toDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
      projectCode: entrada.project.code,
      projectName: entrada.project.name,
      date: toDateKey(entrada.recorded_at),
      entradaAt: entrada.recorded_at,
      salidaAt: null,
      hoursWorked: null,
      overtimeDay: null,
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

      const hoursWorked = round2(
        (new Date(record.recorded_at).getTime() - new Date(open.recorded_at).getTime()) /
          3_600_000
      );
      const overtimeDay = round2(Math.max(0, hoursWorked - STANDARD_WORKDAY_HOURS));

      rows.push({
        key: open.id,
        workerId: open.worker_id,
        workerName: open.worker.full_name,
        documentId: open.worker.document_id,
        projectCode: open.project.code,
        projectName: open.project.name,
        date: toDateKey(open.recorded_at),
        entradaAt: open.recorded_at,
        salidaAt: record.recorded_at,
        hoursWorked,
        overtimeDay,
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
