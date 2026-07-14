"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders } from "@fortawesome/free-solid-svg-icons";
import type { Project, Worker } from "@/lib/types";
import type { PayrollByProject, WorkerPayrollRow, PayrollSummary } from "@/lib/payroll";
import { Pagination } from "@/components/Pagination";
import { PayrollTable } from "./PayrollTable";
import { PayrollExcelExport } from "./PayrollExcelExport";

function currency(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

export function ControlClient({
  from,
  to,
  projects,
  selectedProjectId,
  payrollYear,
  payrollRows,
  payrollSummary,
  payrollByProject,
  hasParamsForPeriod,
  activeWorkers,
  selectedWorkerId,
  includePrimas,
  payrollPage,
  payrollTotalPages,
  totalPayrollRows,
}: {
  from: string;
  to: string;
  projects: Project[];
  selectedProjectId: string;
  payrollYear: number;
  payrollRows: WorkerPayrollRow[];
  payrollSummary: PayrollSummary;
  payrollByProject: PayrollByProject[];
  hasParamsForPeriod: boolean;
  activeWorkers: Pick<Worker, "id" | "full_name" | "document_id">[];
  selectedWorkerId: string;
  includePrimas: boolean;
  payrollPage: number;
  payrollTotalPages: number;
  totalPayrollRows: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Control de Nominas</h1>
        <p className="text-sm text-neutral-500">
          Liquidación de nómina calculada por trabajador a partir de las
          marcaciones reales — mismos factores y fórmulas que usan hoy las
          plantillas de Excel de la empresa.
        </p>
      </div>

      <Link
        href={`/parametros/${payrollYear}`}
        className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faSliders} className="h-5 w-5 text-brand-dark" />
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Parámetros legales
            </h2>
            <p className="text-xs text-neutral-500">
              Salario mínimo, factores, aportes y horario de jornada — se
              editan en Parámetros, organizados por año.
            </p>
          </div>
        </div>
        <span className="text-sm font-medium text-brand-dark">Ir a Parámetros →</span>
      </Link>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Nómina calculada por trabajador
              {selectedProjectId !== "all" &&
                (() => {
                  const selected = projects.find((p) => p.id === selectedProjectId);
                  return selected ? ` — ${selected.name}` : "";
                })()}
            </h2>
            <p className="text-sm text-neutral-500">
              Básico, extras, transporte y neto — calculado a partir de las
              marcaciones QR reales del período, con los parámetros de{" "}
              {payrollYear}.
            </p>
          </div>
          <PayrollExcelExport
            from={from}
            to={to}
            payrollByProject={payrollByProject}
          />
        </div>

        <form
          method="get"
          className="mb-5 space-y-3 rounded-xl bg-neutral-50 p-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Desde
              </label>
              <input
                type="date"
                name="from"
                defaultValue={from}
                required
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Hasta
              </label>
              <input
                type="date"
                name="to"
                defaultValue={to}
                required
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Proyecto
              </label>
              <select
                name="project"
                defaultValue={selectedProjectId}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="all">Todos los proyectos</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Trabajador
              </label>
              <select
                name="worker"
                defaultValue={selectedWorkerId}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">Todos los activos</option>
                {activeWorkers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.full_name} ({worker.document_id})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand"
            >
              Calcular
            </button>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                name="includePrimas"
                value="1"
                defaultChecked={includePrimas}
                className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
              />
              Incluir primas en este período
            </label>
            <p className="mt-1 text-xs text-neutral-400">
              Activalo solo cuando corresponda pagar la prima — no se
              prorratea sola en cada período.
            </p>
          </div>
        </form>

        {includePrimas && (
          <p className="mb-4 rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">
            Primas incluidas en este período — el cálculo y los volantes de
            este rango de fechas ya suman la prima de servicios.
          </p>
        )}

        {!hasParamsForPeriod ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            No hay parámetros legales guardados para {payrollYear}. Guardá los
            parámetros de ese año en{" "}
            <Link href={`/parametros/${payrollYear}`} className="font-semibold underline">
              Parámetros
            </Link>{" "}
            antes de calcular la nómina.
          </p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Trabajadores"
                value={String(payrollSummary.workersCount)}
              />
              <StatTile
                label="Total básico"
                value={currency(payrollSummary.totalBasico)}
              />
              <StatTile
                label="Total extras"
                value={currency(payrollSummary.totalExtras)}
              />
              <StatTile
                label="Costo nómina (neto)"
                value={currency(payrollSummary.totalNomina)}
              />
              <StatTile
                label="Costo aportes empleador"
                value={currency(payrollSummary.totalEmployerCost)}
              />
            </div>

            {payrollSummary.workersMissingSalary > 0 && (
              <p className="mb-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                {payrollSummary.workersMissingSalary} trabajador(es) sin
                salario cargado — sus extras y básico dan en $0. Cargalo en{" "}
                <Link href="/trabajadores" className="font-semibold underline">
                  Trabajadores
                </Link>
                .
              </p>
            )}

            <PayrollTable rows={payrollRows} from={from} to={to} />

            <Pagination
              basePath="/nomina"
              searchParams={{
                from,
                to,
                project: selectedProjectId,
                worker: selectedWorkerId || undefined,
                includePrimas: includePrimas ? "1" : undefined,
              }}
              page={payrollPage}
              totalPages={payrollTotalPages}
              totalItems={totalPayrollRows}
            />
          </>
        )}
      </div>
    </div>
  );
}
