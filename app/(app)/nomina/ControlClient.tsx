"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import type { LegalParameters, Project, Worker } from "@/lib/types";
import type { PayrollByProject, WorkerPayrollRow, PayrollSummary } from "@/lib/payroll";
import { DEFAULT_LEGAL_PARAMETER_VALUES } from "@/lib/legalParameters";
import { Pagination } from "@/components/Pagination";
import { saveLegalParameters, type ActionState } from "./actions";
import { PayrollTable } from "./PayrollTable";
import { PayrollExcelExport } from "./PayrollExcelExport";

const initialState: ActionState = {};

type PercentField = {
  name: keyof LegalParameters;
  code: string;
  label: string;
  hint: string;
};

const FACTOR_FIELDS: PercentField[] = [
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

const SOCIAL_SECURITY_FIELDS: PercentField[] = [
  { name: "health_employer_percent", code: "Salud", label: "Aporte empleador", hint: "% del básico." },
  { name: "health_employee_percent", code: "Salud", label: "Aporte trabajador", hint: "% del básico, se descuenta del neto." },
  { name: "pension_employer_percent", code: "Pensión", label: "Aporte empleador", hint: "% del básico." },
  { name: "pension_employee_percent", code: "Pensión", label: "Aporte trabajador", hint: "% del básico, se descuenta del neto." },
  { name: "fsp_employee_percent", code: "FSP", label: "Fondo solidaridad pensional", hint: "% del básico, se descuenta del neto." },
];

const PARAFISCAL_FIELDS: PercentField[] = [
  { name: "caja_compensacion_percent", code: "Caja", label: "Caja de compensación", hint: "% del básico, costo empleador." },
  { name: "icbf_percent", code: "ICBF", label: "ICBF", hint: "% del básico, costo empleador." },
  { name: "sena_percent", code: "SENA", label: "SENA", hint: "% del básico, costo empleador." },
];

const PRESTACIONES_FIELDS: PercentField[] = [
  { name: "cesantias_percent", code: "Cesantías", label: "Cesantías", hint: "% del básico, costo empleador." },
  { name: "cesantias_interes_percent", code: "Int. cesantías", label: "Intereses de cesantías", hint: "% del básico, costo empleador." },
  { name: "vacaciones_percent", code: "Vacaciones", label: "Vacaciones", hint: "% del básico, costo empleador." },
  { name: "primas_percent", code: "Primas", label: "Primas de servicios", hint: "% del básico, se paga al trabajador." },
];

const ARL_FIELDS: PercentField[] = [
  { name: "arl_level_1_percent", code: "Nivel 1", label: "ARL riesgo I", hint: "% del básico, costo empleador." },
  { name: "arl_level_2_percent", code: "Nivel 2", label: "ARL riesgo II", hint: "% del básico, costo empleador." },
  { name: "arl_level_3_percent", code: "Nivel 3", label: "ARL riesgo III", hint: "% del básico, costo empleador." },
  { name: "arl_level_4_percent", code: "Nivel 4", label: "ARL riesgo IV", hint: "% del básico, costo empleador." },
  { name: "arl_level_5_percent", code: "Nivel 5", label: "ARL riesgo V", hint: "% del básico, costo empleador." },
];

const INCAPACIDAD_FIELD: PercentField = {
  name: "incapacidad_percent",
  code: "Incapacidad",
  label: "Incapacidades",
  hint: "% del básico que se paga al trabajador.",
};

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

function PercentFieldGroup({
  title,
  hint,
  fields,
  values,
}: {
  title: string;
  hint?: string;
  fields: PercentField[];
  values: Record<string, number>;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              {field.code} — {field.label}
            </label>
            <input
              name={field.name}
              type="number"
              min="0"
              step="0.0001"
              required
              defaultValue={values[field.name]}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-xs text-neutral-400">{field.hint}</p>
          </div>
        ))}
      </div>
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
  activeWorkers,
  selectedWorkerId,
  includePrimas,
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
  activeWorkers: Pick<Worker, "id" | "full_name" | "document_id">[];
  selectedWorkerId: string;
  includePrimas: boolean;
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

  const values = (parametersByYear[selectedYear] ?? {
    ...DEFAULT_LEGAL_PARAMETER_VALUES,
    minimum_wage: parametersByYear[availableYears[1]]?.minimum_wage ?? 0,
    transport_allowance:
      parametersByYear[availableYears[1]]?.transport_allowance ?? 0,
  }) as unknown as Record<string, number>;
  const lunchBreakStart =
    parametersByYear[selectedYear]?.lunch_break_start ??
    DEFAULT_LEGAL_PARAMETER_VALUES.lunch_break_start;
  const lunchBreakEnd =
    parametersByYear[selectedYear]?.lunch_break_end ??
    DEFAULT_LEGAL_PARAMETER_VALUES.lunch_break_end;

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
              Salario mínimo, auxilios, factores de recargo, aportes y
              prestaciones por año.
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

            <form key={formKey} action={formAction} className="space-y-6">
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
                  Horario de almuerzo
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Se descuenta de las horas trabajadas en Reportes (hora
                  muerta). Si más adelante hay que descontar otro horario
                  muerto, se agrega junto a este.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Inicio
                    </label>
                    <input
                      name="lunch_break_start"
                      type="time"
                      required
                      defaultValue={lunchBreakStart.slice(0, 5)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Fin
                    </label>
                    <input
                      name="lunch_break_end"
                      type="time"
                      required
                      defaultValue={lunchBreakEnd.slice(0, 5)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    />
                  </div>
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

              <PercentFieldGroup
                title="Seguridad social (salud, pensión, FSP)"
                fields={SOCIAL_SECURITY_FIELDS}
                values={values}
              />
              <PercentFieldGroup
                title="Aportes parafiscales"
                fields={PARAFISCAL_FIELDS}
                values={values}
              />
              <PercentFieldGroup
                title="Prestaciones sociales"
                fields={PRESTACIONES_FIELDS}
                values={values}
              />
              <PercentFieldGroup
                title="ARL — riesgo profesional (nivel 1 a 5)"
                hint="El nivel de riesgo se asigna por trabajador en Trabajadores."
                fields={ARL_FIELDS}
                values={values}
              />
              <PercentFieldGroup
                title="Incapacidades"
                fields={[INCAPACIDAD_FIELD]}
                values={values}
              />

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
