import type { LegalParameters } from "@/lib/types";
import { parseTimeOfDay, type DeadTimeWindow } from "@/lib/reports";

/**
 * Valores por defecto para un año sin parámetros cargados todavía — los
 * mismos factores que usan hoy las 4 plantillas de nómina de la empresa
 * (hoja HORAS EXTRAS, fila 8), más los porcentajes legales típicos
 * colombianos para los aportes/prestaciones agregados en la corrección de
 * specs del 2026-07-13. El admin los puede ajustar antes de guardar.
 */
export const DEFAULT_LEGAL_PARAMETER_VALUES: Omit<
  LegalParameters,
  "id" | "year" | "created_at" | "updated_at"
> = {
  minimum_wage: 0,
  transport_allowance: 0,
  overtime_day_factor: 1.25,
  overtime_night_factor: 1.75,
  night_surcharge_factor: 0.35,
  holiday_day_factor: 1.8,
  holiday_night_surcharge_factor: 1.1,
  holiday_night_factor: 2.1,
  holiday_overtime_day_factor: 2.0,
  holiday_overtime_night_factor: 2.5,
  lunch_subsidy_per_day: 0,
  lunch_break_start: "12:00:00",
  lunch_break_end: "13:00:00",
  health_employer_percent: 0.085,
  health_employee_percent: 0.04,
  pension_employer_percent: 0.12,
  pension_employee_percent: 0.04,
  fsp_employee_percent: 0,
  caja_compensacion_percent: 0.04,
  icbf_percent: 0.03,
  sena_percent: 0.02,
  cesantias_percent: 0.0833,
  cesantias_interes_percent: 0.01,
  vacaciones_percent: 0.0417,
  primas_percent: 0.0833,
  arl_level_1_percent: 0.00522,
  arl_level_2_percent: 0.01044,
  arl_level_3_percent: 0.02436,
  arl_level_4_percent: 0.0435,
  arl_level_5_percent: 0.0696,
  incapacidad_percent: 0,
};

/**
 * Ventanas de "hora muerta" a descontar de las horas trabajadas en Reportes
 * (ver lib/reports.ts, deadTimeMinutesBetween). Hoy solo el almuerzo; para
 * descontar otro horario muerto a futuro (ej. un segundo descanso), agregar
 * sus columnas a legal_parameters y otra entrada acá.
 */
export function legalParametersToDeadTimeWindows(
  params: Pick<LegalParameters, "lunch_break_start" | "lunch_break_end">
): DeadTimeWindow[] {
  const start = parseTimeOfDay(params.lunch_break_start);
  const end = parseTimeOfDay(params.lunch_break_end);
  return [
    {
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
    },
  ];
}

export function arlPercentForLevel(
  params: Pick<
    LegalParameters,
    | "arl_level_1_percent"
    | "arl_level_2_percent"
    | "arl_level_3_percent"
    | "arl_level_4_percent"
    | "arl_level_5_percent"
  >,
  level: number
): number {
  switch (level) {
    case 1:
      return params.arl_level_1_percent;
    case 2:
      return params.arl_level_2_percent;
    case 3:
      return params.arl_level_3_percent;
    case 4:
      return params.arl_level_4_percent;
    case 5:
      return params.arl_level_5_percent;
    default:
      return params.arl_level_1_percent;
  }
}
