import type { AttendanceRecordWithRelations, LegalParameters, Worker } from "@/lib/types";
import { buildWorkedHoursReport, STANDARD_WORKDAY_HOURS } from "@/lib/reports";
import { isFestivo } from "@/lib/colombianHolidays";

/**
 * Motor de cálculo de nómina — replica las fórmulas reales de las 4
 * plantillas "PLANTILLA DE NOMINA 2026 GENERAL" (hoja HORAS EXTRAS y
 * NOMINA), pero deriva las horas por categoría de las marcaciones QR reales
 * en vez de que alguien las tipee día por día.
 *
 * Asunciones documentadas (no confirmadas aún por el cliente — ver
 * specs_002.md sección 5 y specs_003.md sección 4, pendientes):
 * - Franja nocturna: 19:00–06:00 (Ley 2101 de 2021, vigente desde jul-2025).
 * - Jornada ordinaria: primeras 8 horas trabajadas por sesión (mismo umbral
 *   que STANDARD_WORKDAY_HOURS en lib/reports.ts); el resto es hora extra.
 * - Festivo = domingo o festivo colombiano (lib/colombianHolidays.ts),
 *   tomando la fecha de la marcación de ENTRADA como referencia del día.
 * - "RN dominical" (columna T de HORAS EXTRAS, factor holiday_night_surcharge_factor)
 *   no se calcula automáticamente todavía: en las 4 plantillas siempre se
 *   ve en 0, es un campo manual raramente usado. Queda como ajuste manual futuro.
 * - Primas, prestaciones sociales, finiquitos e incapacidades NO se calculan
 *   acá (pregunta abierta en logic.spec.md sección 9).
 */

const NIGHT_START_HOUR = 19;
const NIGHT_END_HOUR = 6;
const MONTH_HOURS_BASE = 240;
const EMPLOYEE_HEALTH_PCT = 0.04;
const EMPLOYEE_PENSION_PCT = 0.04;
const TRANSPORT_ALLOWANCE_SALARY_CAP_MULTIPLIER = 2;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Minutos de [start, end) que caen dentro de la franja nocturna (19:00–06:00). */
function nightMinutesBetween(start: Date, end: Date): number {
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

interface HourBuckets {
  hed: number;
  hen: number;
  rn: number;
  hfd: number;
  hfn: number;
  hefd: number;
  hefn: number;
}

function emptyBuckets(): HourBuckets {
  return { hed: 0, hen: 0, rn: 0, hfd: 0, hfn: 0, hefd: 0, hefn: 0 };
}

/** Clasifica una sesión (entrada→salida) en las 7 categorías auto-calculables. */
function classifySession(entradaAt: string, salidaAt: string, buckets: HourBuckets) {
  const entrada = new Date(entradaAt);
  const salida = new Date(salidaAt);
  if (salida <= entrada) return;

  const ordinaryEndMs = Math.min(
    salida.getTime(),
    entrada.getTime() + STANDARD_WORKDAY_HOURS * 3_600_000
  );
  const ordinaryEnd = new Date(ordinaryEndMs);

  const ordinaryMinutesTotal = (ordinaryEnd.getTime() - entrada.getTime()) / 60_000;
  const ordinaryNightHours = nightMinutesBetween(entrada, ordinaryEnd) / 60;
  const ordinaryDayHours = ordinaryMinutesTotal / 60 - ordinaryNightHours;

  const extraMinutesTotal = Math.max(0, (salida.getTime() - ordinaryEnd.getTime()) / 60_000);
  const extraNightHours =
    extraMinutesTotal > 0 ? nightMinutesBetween(ordinaryEnd, salida) / 60 : 0;
  const extraDayHours = extraMinutesTotal / 60 - extraNightHours;

  const festivo = isFestivo(entrada);

  if (festivo) {
    buckets.hfd += ordinaryDayHours;
    buckets.hfn += ordinaryNightHours;
    buckets.hefd += extraDayHours;
    buckets.hefn += extraNightHours;
  } else {
    buckets.rn += ordinaryNightHours;
    buckets.hed += extraDayHours;
    buckets.hen += extraNightHours;
  }
}

export interface PayrollCategory {
  key: keyof HourBuckets;
  /** Sigla usada en la plantilla Excel (HED, HEN, RN, HFD, HFN, HEFD, HEFN). */
  code: string;
  label: string;
  hours: number;
  factor: number;
  value: number;
}

export interface WorkerPayrollRow {
  workerId: string;
  workerName: string;
  documentId: string;
  monthlySalary: number | null;
  missingSalary: boolean;
  daysWorked: number;
  categories: PayrollCategory[];
  basico: number;
  extrasTotal: number;
  transportAllowance: number;
  lunchSubsidy: number;
  totalEarned: number;
  healthDeduction: number;
  pensionDeduction: number;
  netPay: number;
}

function buildCategories(buckets: HourBuckets, salary: number, params: LegalParameters): PayrollCategory[] {
  const hourValue = (hours: number, factor: number) =>
    round2((salary * hours * factor) / MONTH_HOURS_BASE);

  return [
    {
      key: "hed",
      code: "HED",
      label: "Hora extra diurna",
      hours: round2(buckets.hed),
      factor: params.overtime_day_factor,
      value: hourValue(buckets.hed, params.overtime_day_factor),
    },
    {
      key: "hen",
      code: "HEN",
      label: "Hora extra nocturna",
      hours: round2(buckets.hen),
      factor: params.overtime_night_factor,
      value: hourValue(buckets.hen, params.overtime_night_factor),
    },
    {
      key: "rn",
      code: "RN",
      label: "Recargo nocturno",
      hours: round2(buckets.rn),
      factor: params.night_surcharge_factor,
      value: hourValue(buckets.rn, params.night_surcharge_factor),
    },
    {
      key: "hfd",
      code: "HFD",
      label: "Hora festiva diurna",
      hours: round2(buckets.hfd),
      factor: params.holiday_day_factor,
      value: hourValue(buckets.hfd, params.holiday_day_factor),
    },
    {
      key: "hfn",
      code: "HFN",
      label: "Hora festiva nocturna",
      hours: round2(buckets.hfn),
      factor: params.holiday_night_factor,
      value: hourValue(buckets.hfn, params.holiday_night_factor),
    },
    {
      key: "hefd",
      code: "HEFD",
      label: "Hora extra festiva diurna",
      hours: round2(buckets.hefd),
      factor: params.holiday_overtime_day_factor,
      value: hourValue(buckets.hefd, params.holiday_overtime_day_factor),
    },
    {
      key: "hefn",
      code: "HEFN",
      label: "Hora extra festiva nocturna",
      hours: round2(buckets.hefn),
      factor: params.holiday_overtime_night_factor,
      value: hourValue(buckets.hefn, params.holiday_overtime_night_factor),
    },
  ];
}

/**
 * Construye la liquidación de nómina por trabajador para un período,
 * a partir de las marcaciones de asistencia + el maestro de trabajadores +
 * los parámetros legales del año. Espejo de la hoja NOMINA de la plantilla.
 */
export function buildPayrollReport(
  records: AttendanceRecordWithRelations[],
  workers: Pick<Worker, "id" | "full_name" | "document_id" | "monthly_salary">[],
  legalParams: LegalParameters
): WorkerPayrollRow[] {
  const sessions = buildWorkedHoursReport(records);

  const daysByWorker = new Map<string, Set<string>>();
  const bucketsByWorker = new Map<string, HourBuckets>();

  for (const session of sessions) {
    const days = daysByWorker.get(session.workerId) ?? new Set<string>();
    days.add(session.date);
    daysByWorker.set(session.workerId, days);

    if (!session.hasCheckout || !session.salidaAt) continue;
    const buckets = bucketsByWorker.get(session.workerId) ?? emptyBuckets();
    classifySession(session.entradaAt, session.salidaAt, buckets);
    bucketsByWorker.set(session.workerId, buckets);
  }

  const rows: WorkerPayrollRow[] = [];

  for (const worker of workers) {
    const daysWorked = daysByWorker.get(worker.id)?.size ?? 0;
    if (daysWorked === 0) continue;

    const buckets = bucketsByWorker.get(worker.id) ?? emptyBuckets();
    const missingSalary = worker.monthly_salary == null;
    const salary = worker.monthly_salary ?? 0;

    const categories = buildCategories(buckets, salary, legalParams);
    const extrasTotal = round2(categories.reduce((sum, c) => sum + c.value, 0));
    const basico = round2((salary / 30) * daysWorked);

    const transportEligible =
      !missingSalary && salary <= legalParams.minimum_wage * TRANSPORT_ALLOWANCE_SALARY_CAP_MULTIPLIER;
    const transportAllowance = transportEligible
      ? round2((legalParams.transport_allowance / 30) * daysWorked)
      : 0;

    const lunchSubsidy = round2(legalParams.lunch_subsidy_per_day * daysWorked);

    const totalEarned = round2(basico + extrasTotal + transportAllowance + lunchSubsidy);
    const healthDeduction = round2(basico * EMPLOYEE_HEALTH_PCT);
    const pensionDeduction = round2(basico * EMPLOYEE_PENSION_PCT);
    const netPay = round2(totalEarned - healthDeduction - pensionDeduction);

    rows.push({
      workerId: worker.id,
      workerName: worker.full_name,
      documentId: worker.document_id,
      monthlySalary: worker.monthly_salary,
      missingSalary,
      daysWorked,
      categories,
      basico,
      extrasTotal,
      transportAllowance,
      lunchSubsidy,
      totalEarned,
      healthDeduction,
      pensionDeduction,
      netPay,
    });
  }

  return rows.sort((a, b) => a.workerName.localeCompare(b.workerName));
}

export interface PayrollSummary {
  workersCount: number;
  totalBasico: number;
  totalExtras: number;
  totalNomina: number;
  workersMissingSalary: number;
}

export function summarizePayroll(rows: WorkerPayrollRow[]): PayrollSummary {
  return {
    workersCount: rows.length,
    totalBasico: round2(rows.reduce((sum, r) => sum + r.basico, 0)),
    totalExtras: round2(rows.reduce((sum, r) => sum + r.extrasTotal, 0)),
    totalNomina: round2(rows.reduce((sum, r) => sum + r.netPay, 0)),
    workersMissingSalary: rows.filter((r) => r.missingSalary).length,
  };
}
