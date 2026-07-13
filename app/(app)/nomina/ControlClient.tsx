"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import type { LegalParameters, Project } from "@/lib/types";
import type { PayrollByProject, WorkerPayrollRow, PayrollSummary } from "@/lib/payroll";
import { DEFAULT_LEGAL_PARAMETER_VALUES } from "@/lib/legalParameters";
import { Pagination } from "@/components/Pagination";
import { saveLegalParameters, type ActionState } from "./actions";
import { PayrollTable } from "./PayrollTable";
import { PayrollExcelExport } from "./PayrollExcelExport";

const initialState: ActionState = {};

const FACTOR_FIELDS: {
  name: keyof Omit<
    LegalParameters,
    | "id"
    | "year"
    | "created_at"
    | "updated_at"
    | "minimum_wage"
    | "transport_allowance"
    | "lunch_subsidy_per_day"
  >;
  code: string;
  label: string;
  hint: string;
}[] = [
  {
    name: "overtime_day_factor",
    code: "HED",
    label: "Hora extra diurna",
    hint: "Más allá de 8h/día, en franja diurna.",
  },
  {
    name: "overtime_night_factor",
    code: "HEN",
    label: "Hora extra nocturna",
    hint: "Más allá de 8h/día, en franja nocturna.",
  },
  {
    name: "night_surcharge_factor",
    code: "RN",
    label: "Recargo nocturno",
    hint: "Hora ordinaria trabajada en franja nocturna.",
  },
  {
    name: "holiday_day_factor",
    code: "HFD",
    label: "Hora festiva diurna",
    hint: "Hora ordinaria en domingo/festivo, diurna.",
  },
  {
    name: "holiday_night_surcharge_factor",
    code: "RN Dominical",
    label: "Recargo nocturno dominical",
    hint: "Ajuste manual — no se calcula automático todavía.",
  },
  {
    name: "holiday_night_factor",
    code: "HFN",
    label: "Hora festiva nocturna",
    hint: "Hora ordinaria en domingo/festivo, nocturna.",
  },
  {
    name: "holiday_overtime_day_factor",
    code: "HEFD",
    label: "Hora extra festiva diurna",
    hint: "Más allá de 8h/día, en domingo/festivo, diurna.",
  },
  {
    name: "holiday_overtime_night_factor",
    code: "HEFN",
    label: "Hora extra festiva nocturna",
    hint: "Más allá de 8h/día, en domingo/festivo, nocturna.",
  },
];

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
  years,
  parametersByYear,
  from,
  to,
  projects,
  selectedProjectId,
  payrollYear,
  payrollRows,
  payrollSummary,
  payrollByProject,
  hasParamsForPeriod,
  workerQuery,
  payrollPage,
  payrollTotalPages,
  totalPayrollRows,
}: {
  years: number[];
  parametersByYear: Record<number, LegalParameters>;
  from: string;
  to: string;
  projects: Project[];
  selectedProjectId: string;
  payrollYear: number;
  payrollRows: WorkerPayrollRow[];
  payrollSummary: PayrollSummary;
  payrollByProject: PayrollByProject[];
  hasParamsForPeriod: boolean;
  workerQuery: string;
  payrollPage: number;
  payrollTotalPages: number;
  totalPayrollRows: number;
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const set = new Set(years);
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [years, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveLegalParameters,
    initialState
  );
  const [formKey, setFormKey] = useState(0);
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setFormKey((key) => key + 1);
  }

  useEffect(() => {
    if (state.success) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const values = parametersByYear[selectedYear] ?? {
    ...DEFAULT_LEGAL_PARAMETER_VALUES,
    minimum_wage: parametersByYear[availableYears[1]]?.minimum_wage ?? 0,
    transport_allowance:
      parametersByYear[availableYears[1]]?.transport_allowance ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Control de Nominas</h1>
        <p className="text-sm text-neutral-500">
          Parámetros legales por año y liquidación de nómina calculada por
          trabajador a partir de las marcaciones reales — mismos factores y
          fórmulas que usan hoy las plantillas de Excel de la empresa.
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setParamsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left"
        >
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Parametrización de años
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Salario mínimo, auxilios y factores de recargo por año.
            </p>
          </div>
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${
              paramsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {paramsOpen && (
          <div className="px-5 pb-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    year === selectedYear
                      ? "bg-brand-dark text-white"
                      : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {year}
                  {!parametersByYear[year] && (
                    <span className="ml-1 text-xs opacity-70">(nuevo)</span>
                  )}
                </button>
              ))}
            </div>

            <form key={formKey} action={formAction} className="space-y-5">
              <input type="hidden" name="year" value={selectedYear} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Salario mínimo mensual
                  </label>
                  <input
                    name="minimum_wage"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={values.minimum_wage}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Auxilio de transporte
                  </label>
                  <input
                    name="transport_allowance"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={values.transport_allowance}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Subsidio de almuerzo / día
                  </label>
                  <input
                    name="lunch_subsidy_per_day"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={values.lunch_subsidy_per_day}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Factores de recargo y horas extra
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Multiplicador sobre la hora ordinaria (salario/240) — igual
                  que la columna de cada tipo en la hoja HORAS EXTRAS de la
                  plantilla.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {FACTOR_FIELDS.map((field) => (
                    <div key={field.name}>
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        {field.code} — {field.label}
                      </label>
                      <input
                        name={field.name}
                        type="number"
                        min="0"
                        step="0.001"
                        required
                        defaultValue={values[field.name]}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      />
                      <p className="mt-1 text-xs text-neutral-400">
                        {field.hint}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {state.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </p>
              )}
              {state.success && (
                <p className="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">
                  Parámetros de {selectedYear} guardados.
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60 sm:w-auto"
              >
                {pending
                  ? "Guardando..."
                  : `Guardar parámetros de ${selectedYear}`}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Nómina calculada por trabajador
              {selectedProjectId !== "all" &&
                (() => {
                  const selected = projects.find((p) => p.id === selectedProjectId);
                  return selected ? ` — ${selected.code}` : "";
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
          className="mb-5 flex flex-wrap items-end gap-3 rounded-xl bg-neutral-50 p-4"
        >
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
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Trabajador
            </label>
            <input
              type="text"
              name="worker"
              defaultValue={workerQuery}
              placeholder="Nombre o documento..."
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand"
          >
            Calcular
          </button>
        </form>

        {!hasParamsForPeriod ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            No hay parámetros legales guardados para {payrollYear}. Guardá los
            parámetros de ese año arriba antes de calcular la nómina.
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

            <PayrollTable rows={payrollRows} />

            <Pagination
              basePath="/nomina"
              searchParams={{
                from,
                to,
                project: selectedProjectId,
                worker: workerQuery || undefined,
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
