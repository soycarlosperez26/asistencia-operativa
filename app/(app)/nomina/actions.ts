"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export interface ActionState {
  error?: string;
  success?: boolean;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return null;
  }
  return profile;
}

function parsePositiveNumber(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

const NUMERIC_FIELDS = [
  "minimum_wage",
  "transport_allowance",
  "overtime_day_factor",
  "overtime_night_factor",
  "night_surcharge_factor",
  "holiday_day_factor",
  "holiday_night_surcharge_factor",
  "holiday_night_factor",
  "holiday_overtime_day_factor",
  "holiday_overtime_night_factor",
  "lunch_subsidy_per_day",
  "health_employer_percent",
  "health_employee_percent",
  "pension_employer_percent",
  "pension_employee_percent",
  "fsp_employee_percent",
  "caja_compensacion_percent",
  "icbf_percent",
  "sena_percent",
  "cesantias_percent",
  "cesantias_interes_percent",
  "vacaciones_percent",
  "primas_percent",
  "arl_level_1_percent",
  "arl_level_2_percent",
  "arl_level_3_percent",
  "arl_level_4_percent",
  "arl_level_5_percent",
  "incapacidad_percent",
] as const;

export async function saveLegalParameters(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) {
    return { error: "No tienes permisos para editar los parámetros legales." };
  }

  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "El año no es válido." };
  }

  const fields = Object.fromEntries(
    NUMERIC_FIELDS.map((field) => [field, parsePositiveNumber(formData, field)])
  );

  if (Object.values(fields).some((value) => value === null)) {
    return { error: "Todos los valores son obligatorios y deben ser números válidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("legal_parameters")
    .upsert(
      { year, ...fields, updated_at: new Date().toISOString() },
      { onConflict: "year" }
    );

  if (error) {
    return { error: "No se pudieron guardar los parámetros legales." };
  }

  revalidatePath("/nomina");
  return { success: true };
}
