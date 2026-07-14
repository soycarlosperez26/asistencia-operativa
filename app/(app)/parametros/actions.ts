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

function parseNonNegativeInteger(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

/** Valida un input type="time" ("HH:MM") y lo normaliza a "HH:MM:00". */
function parseTimeField(formData: FormData, field: string): string | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return null;
  return `${raw}:00`;
}

const NUMERIC_FIELDS = [
  "minimum_wage",
  "transport_allowance",
  "lunch_subsidy_per_day",
  "overtime_day_factor",
  "overtime_night_factor",
  "night_surcharge_factor",
  "holiday_day_factor",
  "holiday_night_surcharge_factor",
  "holiday_night_factor",
  "holiday_overtime_day_factor",
  "holiday_overtime_night_factor",
  "weekly_legal_hours",
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

const TIME_FIELDS = ["shift_start", "shift_end", "lunch_break_start", "lunch_break_end"] as const;

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

  const timeFields = Object.fromEntries(
    TIME_FIELDS.map((field) => [field, parseTimeField(formData, field)])
  );

  if (Object.values(timeFields).some((value) => value === null)) {
    return { error: "El horario de jornada o de almuerzo no es válido." };
  }

  const graceMinutes = parseNonNegativeInteger(formData, "grace_minutes");
  if (graceMinutes === null) {
    return { error: "El tiempo de espera debe ser un número entero mayor o igual a 0." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("legal_parameters")
    .upsert(
      {
        year,
        ...fields,
        ...timeFields,
        grace_minutes: graceMinutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "year" }
    );

  if (error) {
    console.error("saveLegalParameters upsert error:", error);
    return {
      error: error.message
        ? `No se pudieron guardar los parámetros legales: ${error.message}`
        : "No se pudieron guardar los parámetros legales.",
    };
  }

  revalidatePath("/parametros/[year]", "page");
  revalidatePath("/nomina");
  revalidatePath("/reportes");
  return { success: true };
}
