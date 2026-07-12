import type { LegalParameters } from "@/lib/types";

/**
 * Valores por defecto para un año sin parámetros cargados todavía — los
 * mismos factores que usan hoy las 4 plantillas de nómina de la empresa
 * (hoja HORAS EXTRAS, fila 8). El admin los puede ajustar antes de guardar.
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
};
