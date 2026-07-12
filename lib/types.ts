export type UserRole = "admin" | "supervisor";
export type AttendanceType = "entrada" | "salida";

export interface Project {
  id: string;
  code: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  project_id: string | null;
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
  project: Pick<Project, "id" | "code" | "name">;
  supervisor: Pick<Profile, "id" | "full_name">;
}

/**
 * Parámetros legales de un año: salario mínimo, auxilio de transporte y los
 * 8 factores de recargo/horas extra que usan hoy las 4 plantillas de nómina
 * de la empresa (hoja `HORAS EXTRAS`, fila 8 — idénticos en los 4 proyectos).
 * Cada *_factor es un multiplicador directo: valor = salario * horas *
 * factor / 240 (misma fórmula que la plantilla Excel).
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
  created_at: string;
  updated_at: string;
}
