import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type {
  AttendanceRecordWithRelations,
  LegalParameters,
  Project,
  Worker,
} from "@/lib/types";
import { dateRangeBoundsISO } from "@/lib/reports";
import { buildPayrollReport, summarizePayroll, type PayrollByProject } from "@/lib/payroll";
import { ControlClient } from "./ControlClient";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISODate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

interface ControlSearchParams {
  from?: string;
  to?: string;
  project?: string;
  worker?: string;
  page?: string;
}

const PAGE_SIZE = 15;

export default async function ControlPage({
  searchParams,
}: {
  searchParams: Promise<ControlSearchParams>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/asistencia");

  const supabase = await createClient();

  const from = params.from || daysAgoISODate(14);
  const to = params.to || todayISODate();
  const selectedProjectId = params.project || "all";
  const { startISO, endISO } = dateRangeBoundsISO(from, to);

  const [{ data: parameters }, { data: workers }, { data: projects }, { data: records }] =
    await Promise.all([
      supabase
        .from("legal_parameters")
        .select(
          "id, year, minimum_wage, transport_allowance, overtime_day_factor, overtime_night_factor, night_surcharge_factor, holiday_day_factor, holiday_night_surcharge_factor, holiday_night_factor, holiday_overtime_day_factor, holiday_overtime_night_factor, lunch_subsidy_per_day, created_at, updated_at"
        )
        .order("year", { ascending: false }),
      supabase
        .from("workers")
        .select("id, full_name, document_id, qr_token, active, created_at, monthly_salary")
        .order("full_name"),
      supabase.from("projects").select("id, code, name, active, created_at").order("code"),
      supabase
        .from("attendance_records")
        .select(
          "id, worker_id, project_id, supervisor_id, type, recorded_at, gps_lat, gps_lng, gps_accuracy, observations, worker:workers(id, full_name, document_id), project:projects(id, code, name), supervisor:profiles(id, full_name)"
        )
        .gte("recorded_at", startISO)
        .lte("recorded_at", endISO)
        .order("recorded_at", { ascending: true }),
    ]);

  const parameterRows = (parameters as LegalParameters[]) ?? [];
  const parametersByYear: Record<number, LegalParameters> = {};
  for (const row of parameterRows) {
    parametersByYear[row.year] = row;
  }

  const payrollYear = new Date(`${to}T00:00:00`).getFullYear();
  const activeParams = parametersByYear[payrollYear];

  const allRecords = (records as unknown as AttendanceRecordWithRelations[]) ?? [];
  const workerRows = (workers as Worker[]) ?? [];
  const projectRows = (projects as Project[]) ?? [];

  const filteredRecords =
    selectedProjectId === "all"
      ? allRecords
      : allRecords.filter((r) => r.project_id === selectedProjectId);

  const allPayrollRows = activeParams
    ? buildPayrollReport(filteredRecords, workerRows, activeParams)
    : [];

  const workerQuery = (params.worker ?? "").trim();
  const workerQueryLower = workerQuery.toLowerCase();
  const payrollRowsFiltered = workerQueryLower
    ? allPayrollRows.filter(
        (row) =>
          row.workerName.toLowerCase().includes(workerQueryLower) ||
          row.documentId.toLowerCase().includes(workerQueryLower)
      )
    : allPayrollRows;

  const payrollSummary = summarizePayroll(payrollRowsFiltered);

  const totalPayrollRows = payrollRowsFiltered.length;
  const payrollTotalPages = Math.max(1, Math.ceil(totalPayrollRows / PAGE_SIZE));
  const payrollPage = Math.min(
    Math.max(1, Number(params.page) || 1),
    payrollTotalPages
  );
  const payrollRows = payrollRowsFiltered.slice(
    (payrollPage - 1) * PAGE_SIZE,
    payrollPage * PAGE_SIZE
  );

  const payrollByProject: PayrollByProject[] = [];
  if (activeParams) {
    for (const project of projectRows) {
      const projectRecords = allRecords.filter((r) => r.project_id === project.id);
      if (projectRecords.length === 0) continue;
      const rows = buildPayrollReport(projectRecords, workerRows, activeParams);
      if (rows.length === 0) continue;
      payrollByProject.push({
        project,
        rows,
        summary: summarizePayroll(rows),
      });
    }
  }

  return (
    <ControlClient
      years={parameterRows.map((row) => row.year)}
      parametersByYear={parametersByYear}
      from={from}
      to={to}
      projects={projectRows}
      selectedProjectId={selectedProjectId}
      payrollYear={payrollYear}
      payrollRows={payrollRows}
      payrollSummary={payrollSummary}
      payrollByProject={payrollByProject}
      hasParamsForPeriod={!!activeParams}
      workerQuery={workerQuery}
      payrollPage={payrollPage}
      payrollTotalPages={payrollTotalPages}
      totalPayrollRows={totalPayrollRows}
    />
  );
}
