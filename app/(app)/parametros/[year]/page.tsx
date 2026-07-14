import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { LegalParameters } from "@/lib/types";
import { ParametrosClient } from "./ParametrosClient";

const LEGAL_PARAMETERS_COLUMNS =
  "id, year, minimum_wage, transport_allowance, overtime_day_factor, overtime_night_factor, night_surcharge_factor, holiday_day_factor, holiday_night_surcharge_factor, holiday_night_factor, holiday_overtime_day_factor, holiday_overtime_night_factor, lunch_subsidy_per_day, lunch_break_start, lunch_break_end, shift_start, shift_end, grace_minutes, weekly_legal_hours, health_employer_percent, health_employee_percent, pension_employer_percent, pension_employee_percent, fsp_employee_percent, caja_compensacion_percent, icbf_percent, sena_percent, cesantias_percent, cesantias_interes_percent, vacaciones_percent, primas_percent, arl_level_1_percent, arl_level_2_percent, arl_level_3_percent, arl_level_4_percent, arl_level_5_percent, incapacidad_percent, created_at, updated_at";

export default async function ParametrosYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    notFound();
  }

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/asistencia");

  const supabase = await createClient();
  const { data: parameters } = await supabase
    .from("legal_parameters")
    .select(LEGAL_PARAMETERS_COLUMNS)
    .eq("year", year)
    .maybeSingle();

  return (
    <ParametrosClient
      year={year}
      parameters={parameters as LegalParameters | null}
    />
  );
}
