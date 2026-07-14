export type UserRole = "admin" | "supervisor";
export type AttendanceType = "entrada" | "salida";
export type BloodType = "O+" | "O-" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-";

export interface Project {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Worker {
  id: string;
  full_name: string;
  document_id: string;
  qr_token: string;
  active: boolean;
  created_at: string;
  /** Salario mensual — necesario para que Control calcule la nómina. */
  monthly_salary: number | null;
  birth_date: string | null;
  blood_type: BloodType | null;
  email: string | null;
  phone: string | null;
  /** Cargo del trabajador. */
  job_title: string | null;
  /** Nivel de riesgo ARL (1 a 5), usado para calcular el aporte de ARL en nómina. */
  arl_risk_level: number;
  /** Notas libres del admin sobre el trabajador. */
  notes: string | null;
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  project_id: string;
  supervisor_id: string;
  type: AttendanceType;
  recorded_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  observations: string | null;
}

export interface AttendanceRecordWithRelations extends AttendanceRecord {
  worker: Pick<Worker, "id" | "full_name" | "document_id">;
  project: Pick<Project, "id" | "name">;
  supervisor: Pick<Profile, "id" | "full_name">;
}

/**
 * Parámetros legales de un año: salario mínimo, auxilio de transporte, los
 * 8 factores de recargo/horas extra que usan hoy las 4 plantillas de nómina
 * de la empresa (hoja `HORAS EXTRAS`, fila 8 — idénticos en los 4 proyectos),
 * y los aportes/prestaciones agregados en la corrección de specs del
 * 2026-07-13. Cada *_factor es un multiplicador directo: valor = salario *
 * horas * factor / 240 (misma fórmula que la plantilla Excel). Cada
 * *_percent es un porcentaje directo sobre el básico del período.
 */
export interface LegalParameters {
  id: string;
  year: number;
  minimum_wage: number;
  transport_allowance: number;
  /** HED — hora extra diurna. */
  overtime_day_factor: number;
  /** HEN — hora extra nocturna. */
  overtime_night_factor: number;
  /** RN — recargo nocturno (hora ordinaria en franja nocturna). */
  night_surcharge_factor: number;
  /** HFD — hora festiva/dominical diurna (ordinaria). */
  holiday_day_factor: number;
  /** RN dominical — recargo nocturno en día festivo (manual, no auto-calculado aún). */
  holiday_night_surcharge_factor: number;
  /** HFN — hora festiva/dominical nocturna (ordinaria). */
  holiday_night_factor: number;
  /** HEFD — hora extra festiva/dominical diurna. */
  holiday_overtime_day_factor: number;
  /** HEFN — hora extra festiva/dominical nocturna. */
  holiday_overtime_night_factor: number;
  /** Subsidio de almuerzo por día trabajado. */
  lunch_subsidy_per_day: number;
  /** Hora de inicio del almuerzo ("HH:MM:SS") — se descuenta de las horas trabajadas en Reportes. */
  lunch_break_start: string;
  /** Hora de fin del almuerzo ("HH:MM:SS"). */
  lunch_break_end: string;
  /** Hora de entrada de la jornada ("HH:MM:SS"). */
  shift_start: string;
  /** Hora de salida de la jornada ("HH:MM:SS"). */
  shift_end: string;
  /**
   * Tiempo de espera en minutos: una marcación de entrada temprana, o hasta
   * este margen tardía respecto a shift_start, se registra como shift_start
   * en punto en el cálculo de horas trabajadas (ver applyShiftGracePeriod
   * en lib/reports.ts). No modifica la marca cruda de asistencia.
   */
  grace_minutes: number;
  /**
   * Jornada semanal legal (horas) — dato de referencia (Ley 2101 de 2021 /
   * Ley 2466 de 2025: baja a 42h desde el 15 jul 2026). No se usa todavía en
   * el motor de cálculo de horas extra, que sigue una jornada diaria fija
   * (ver STANDARD_WORKDAY_HOURS en lib/reports.ts).
   */
  weekly_legal_hours: number;
  /** Salud — aporte del empleador (% del básico). */
  health_employer_percent: number;
  /** Salud — aporte del trabajador (% del básico, se descuenta del neto). */
  health_employee_percent: number;
  /** Pensión — aporte del empleador (% del básico). */
  pension_employer_percent: number;
  /** Pensión — aporte del trabajador (% del básico, se descuenta del neto). */
  pension_employee_percent: number;
  /** FSP — fondo de solidaridad pensional (% del básico, se descuenta del neto). */
  fsp_employee_percent: number;
  /** Parafiscal — caja de compensación (% del básico, costo empleador). */
  caja_compensacion_percent: number;
  /** Parafiscal — ICBF (% del básico, costo empleador). */
  icbf_percent: number;
  /** Parafiscal — SENA (% del básico, costo empleador). */
  sena_percent: number;
  /** Prestación social — cesantías (% del básico, costo empleador). */
  cesantias_percent: number;
  /** Prestación social — intereses de cesantías (% del básico, costo empleador). */
  cesantias_interes_percent: number;
  /** Prestación social — vacaciones (% del básico, costo empleador). */
  vacaciones_percent: number;
  /** Prestación social — primas de servicios (% del básico, se paga al trabajador). */
  primas_percent: number;
  /** ARL — riesgo nivel 1 (% del básico, costo empleador). */
  arl_level_1_percent: number;
  /** ARL — riesgo nivel 2 (% del básico, costo empleador). */
  arl_level_2_percent: number;
  /** ARL — riesgo nivel 3 (% del básico, costo empleador). */
  arl_level_3_percent: number;
  /** ARL — riesgo nivel 4 (% del básico, costo empleador). */
  arl_level_4_percent: number;
  /** ARL — riesgo nivel 5 (% del básico, costo empleador). */
  arl_level_5_percent: number;
  /** Incapacidades — porcentaje del básico que se paga al trabajador. */
  incapacidad_percent: number;
  created_at: string;
  updated_at: string;
}
