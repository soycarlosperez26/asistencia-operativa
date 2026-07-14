import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import {
  buildWorkedHoursReport,
  dateRangeBoundsISO,
  formatReportDate,
  formatReportTime,
  STANDARD_WORKDAY_HOURS,
  type WorkedHoursRow,
} from "@/lib/reports";
import type { AttendanceRecordWithRelations, Worker } from "@/lib/types";
import { Pagination } from "@/components/Pagination";
import { ExportExcelButton } from "./ExportExcelButton";
import { WorkerFilterField } from "./WorkerFilterField";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ReportesSearchParams {
  from?: string;
  to?: string;
  worker?: string;
  sort?: string;
  dir?: string;
  page?: string;
}

type SortField = "worker" | "date" | "hours";

const PAGE_SIZE = 20;

function sortRows(rows: WorkedHoursRow[], field: SortField, dir: "asc" | "desc") {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (field === "worker") cmp = a.workerName.localeCompare(b.workerName);
    else if (field === "date") cmp = a.date.localeCompare(b.date);
    else cmp = (a.hoursWorked ?? -1) - (b.hoursWorked ?? -1);

    if (cmp === 0) {
      cmp = a.workerName.localeCompare(b.workerName) || a.date.localeCompare(b.date);
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<ReportesSearchParams>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const today = todayISODate();
  const from = params.from || today;
  const to = params.to || today;
  const workerId = params.worker || undefined;

  const { data: workers } = await supabase
    .from("workers")
    .select("id, full_name, document_id, qr_token, active, created_at")
    .order("full_name");

  const { startISO, endISO } = dateRangeBoundsISO(from, to);

  let query = supabase
    .from("attendance_records")
    .select(
      "id, worker_id, project_id, supervisor_id, type, recorded_at, gps_lat, gps_lng, gps_accuracy, observations, worker:workers(id, full_name, document_id), project:projects(id, name), supervisor:profiles(id, full_name)"
    )
    .gte("recorded_at", startISO)
    .lte("recorded_at", endISO)
    .order("recorded_at", { ascending: true });

  if (workerId) query = query.eq("worker_id", workerId);

  const { data: records } = await query;

  const rows = buildWorkedHoursReport(
    (records as unknown as AttendanceRecordWithRelations[]) ?? []
  );

  const sortField: SortField =
    params.sort === "date" || params.sort === "hours" ? params.sort : "worker";
  const sortDir: "asc" | "desc" = params.dir === "desc" ? "desc" : "asc";
  const sortedRows = sortRows(rows, sortField, sortDir);

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const pageRows = sortedRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const baseSearchParams = {
    from,
    to,
    worker: workerId,
    sort: sortField,
    dir: sortDir,
  };

  function sortHref(field: SortField): string {
    const usp = new URLSearchParams();
    usp.set("from", from);
    usp.set("to", to);
    if (workerId) usp.set("worker", workerId);
    const nextDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    usp.set("sort", field);
    usp.set("dir", nextDir);
    return `/reportes?${usp.toString()}`;
  }

  function sortIndicator(field: SortField): string {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Reporte de Horas Trabajadas
          </h1>
          <p className="text-sm text-neutral-500">
            Consulta detallada de horas trabajadas por trabajador y proyecto.
          </p>
        </div>
        <ExportExcelButton rows={rows} />
      </div>

      <form
        method="get"
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-bold text-neutral-900">
          Filtros de Búsqueda
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Fecha Desde
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Fecha Hasta
            </label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <WorkerFilterField
            workers={(workers as Worker[]) ?? []}
            defaultWorkerId={workerId}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="submit"
            className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand"
          >
            Buscar
          </button>
          <Link
            href="/reportes"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Limpiar Filtros
          </Link>
        </div>
      </form>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Detalle diario de horas trabajadas
        </h2>

        <p className="mb-4 text-xs text-neutral-400">
          Horas extras diurnas (HED) calculadas sobre una jornada estándar de{" "}
          {STANDARD_WORKDAY_HOURS} horas.
        </p>

        {totalRows === 0 ? (
          <p className="text-sm text-neutral-500">
            No hay registros de asistencia en la fecha seleccionada.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="bg-brand-dark text-xs uppercase text-white">
                    <th className="rounded-l-lg px-3 py-2">
                      <Link href={sortHref("worker")} className="hover:underline">
                        Trabajador{sortIndicator("worker")}
                      </Link>
                    </th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">
                      <Link href={sortHref("date")} className="hover:underline">
                        Fecha{sortIndicator("date")}
                      </Link>
                    </th>
                    <th className="px-3 py-2">Proyecto</th>
                    <th className="px-3 py-2">Entrada</th>
                    <th className="px-3 py-2">Salida</th>
                    <th className="px-3 py-2">
                      <Link href={sortHref("hours")} className="hover:underline">
                        Horas Trabajadas{sortIndicator("hours")}
                      </Link>
                    </th>
                    <th className="px-3 py-2">Horas Extras Diurnas</th>
                    <th className="px-3 py-2">Horas Nocturnas</th>
                    <th className="rounded-r-lg px-3 py-2">Horas Festivas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageRows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-3 py-2 font-medium text-neutral-900">
                        {row.workerName}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        {row.documentId}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        <div className="flex items-center gap-1.5">
                          {formatReportDate(row.date)}
                          {row.isHoliday && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Festivo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        {row.projectName}
                      </td>
                      <td className="px-3 py-2 font-medium text-brand-dark">
                        {formatReportTime(row.entradaAt)}
                      </td>
                      <td className="px-3 py-2">
                        {row.salidaAt ? (
                          <span className="font-medium text-orange-600">
                            {formatReportTime(row.salidaAt)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            Sin Marcación
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-900">
                        {row.hoursWorked?.toFixed(2) ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-neutral-900">
                        {row.overtimeDay?.toFixed(2) ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-neutral-900">
                        {row.nightHours?.toFixed(2) ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-neutral-900">
                        {row.holidayHours?.toFixed(2) ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              basePath="/reportes"
              searchParams={baseSearchParams}
              page={currentPage}
              totalPages={totalPages}
              totalItems={totalRows}
            />
          </>
        )}
      </div>
    </div>
  );
}
