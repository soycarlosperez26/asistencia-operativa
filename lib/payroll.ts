import type { AttendanceRecordWithRelations, LegalParameters, Project, Worker } from "@/lib/types";
import { buildWorkedHoursReport, STANDARD_WORKDAY_HOURS } from "@/lib/reports";
import { isFestivo } from "@/lib/colombianHolidays";
import { arlPercentForLevel } from "@/lib/legalParameters";

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

/**
 * Costo de aportes y prestaciones a cargo del empleador — no afecta el neto
 * a pagar del trabajador, es informativo para el costo total de nómina por
 * proyecto (agregado en la corrección de specs del 2026-07-13).
 */
export interface EmployerCost {
  healthEmployer: number;
  pensionEmployer: number;
  cajaCompensacion: number;
  icbf: number;
  sena: number;
  cesantias: number;
  cesantiasInteres: number;
  vacaciones: number;
  arl: number;
  total: number;
}

export interface WorkerPayrollRow {
  workerId: string;
  workerName: string;
  documentId: string;
  monthlySalary: number | null;
  missingSalary: boolean;
  arlRiskLevel: number;
  daysWorked: number;
  /** Nombres de los proyectos en los que el trabajador marcó asistencia en el período. */
  projectNames: string[];
  categories: PayrollCategory[];
  basico: number;
  extrasTotal: number;
  transportAllowance: number;
  lunchSubsidy: number;
  /** Primas de servicios acumuladas del período (se pagan al trabajador). */
  primas: number;
  /** Incapacidades del período, como % del básico (se pagan al trabajador). */
  incapacidad: number;
  totalEarned: number;
  healthDeduction: number;
  pensionDeduction: number;
  /** FSP — fondo de solidaridad pensional, descontado del trabajador. */
  fspDeduction: number;
  netPay: number;
  employerCost: EmployerCost;
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
  workers: Pick<
    Worker,
    "id" | "full_name" | "document_id" | "monthly_salary" | "arl_risk_level"
  >[],
  legalParams: LegalParameters
): WorkerPayrollRow[] {
  const sessions = buildWorkedHoursReport(records);

  const daysByWorker = new Map<string, Set<string>>();
  const bucketsByWorker = new Map<string, HourBuckets>();
  const projectsByWorker = new Map<string, Set<string>>();

  for (const session of sessions) {
    const days = daysByWorker.get(session.workerId) ?? new Set<string>();
    days.add(session.date);
    daysByWorker.set(session.workerId, days);

    const projects = projectsByWorker.get(session.workerId) ?? new Set<string>();
    projects.add(session.projectName);
    projectsByWorker.set(session.workerId, projects);

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
    const primas = round2(basico * legalParams.primas_percent);
    const incapacidad = round2(basico * legalParams.incapacidad_percent);

    const totalEarned = round2(
      basico + extrasTotal + transportAllowance + lunchSubsidy + primas + incapacidad
    );
    const healthDeduction = round2(basico * legalParams.health_employee_percent);
    const pensionDeduction = round2(basico * legalParams.pension_employee_percent);
    const fspDeduction = round2(basico * legalParams.fsp_employee_percent);
    const netPay = round2(totalEarned - healthDeduction - pensionDeduction - fspDeduction);

    const arlPercent = arlPercentForLevel(legalParams, worker.arl_risk_level);
    const employerCost: EmployerCost = {
      healthEmployer: round2(basico * legalParams.health_employer_percent),
      pensionEmployer: round2(basico * legalParams.pension_employer_percent),
      cajaCompensacion: round2(basico * legalParams.caja_compensacion_percent),
      icbf: round2(basico * legalParams.icbf_percent),
      sena: round2(basico * legalParams.sena_percent),
      cesantias: round2(basico * legalParams.cesantias_percent),
      cesantiasInteres: round2(basico * legalParams.cesantias_interes_percent),
      vacaciones: round2(basico * legalParams.vacaciones_percent),
      arl: round2(basico * arlPercent),
      total: 0,
    };
    employerCost.total = round2(
      employerCost.healthEmployer +
        employerCost.pensionEmployer +
        employerCost.cajaCompensacion +
        employerCost.icbf +
        employerCost.sena +
        employerCost.cesantias +
        employerCost.cesantiasInteres +
        employerCost.vacaciones +
        employerCost.arl
    );

    const projectNames = [...(projectsByWorker.get(worker.id) ?? [])].sort();

    rows.push({
      workerId: worker.id,
      workerName: worker.full_name,
      documentId: worker.document_id,
      monthlySalary: worker.monthly_salary,
      missingSalary,
      arlRiskLevel: worker.arl_risk_level,
      daysWorked,
      projectNames,
      categories,
      basico,
      extrasTotal,
      transportAllowance,
      lunchSubsidy,
      primas,
      incapacidad,
      totalEarned,
      healthDeduction,
      pensionDeduction,
      fspDeduction,
      netPay,
      employerCost,
    });
  }

  return rows.sort((a, b) => a.workerName.localeCompare(b.workerName));
}

export interface PayrollSummary {
  workersCount: number;
  totalBasico: number;
  totalExtras: number;
  totalNomina: number;
  totalEmployerCost: number;
  workersMissingSalary: number;
}

export function summarizePayroll(rows: WorkerPayrollRow[]): PayrollSummary {
  return {
    workersCount: rows.length,
    totalBasico: round2(rows.reduce((sum, r) => sum + r.basico, 0)),
    totalExtras: round2(rows.reduce((sum, r) => sum + r.extrasTotal, 0)),
    totalNomina: round2(rows.reduce((sum, r) => sum + r.netPay, 0)),
    totalEmployerCost: round2(rows.reduce((sum, r) => sum + r.employerCost.total, 0)),
    workersMissingSalary: rows.filter((r) => r.missingSalary).length,
  };
}

/** Liquidación de nómina de un proyecto para el período — una "hoja" del consolidado. */
export interface PayrollByProject {
  project: Pick<Project, "id" | "name">;
  rows: WorkerPayrollRow[];
  summary: PayrollSummary;
}
