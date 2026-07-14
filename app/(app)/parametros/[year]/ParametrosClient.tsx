"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { LegalParameters } from "@/lib/types";
import { DEFAULT_LEGAL_PARAMETER_VALUES } from "@/lib/legalParameters";
import { saveLegalParameters, type ActionState } from "../actions";

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
    hint: "Más allá de 8h/día, en franja diurna. 25% de recargo.",
  },
  {
    name: "overtime_night_factor",
    code: "HEN",
    label: "Hora extra nocturna",
    hint: "Más allá de 8h/día, en franja nocturna. 75% de recargo.",
  },
  {
    name: "night_surcharge_factor",
    code: "RN",
    label: "Recargo nocturno",
    hint: "Hora ordinaria trabajada entre 19:00 y 06:00. 35% de recargo.",
  },
  {
    name: "holiday_day_factor",
    code: "HFD",
    label: "Hora festiva diurna",
    hint: "Hora ordinaria en domingo/festivo, diurna. 90% de recargo desde jul-2026 (Ley 2466 de 2025).",
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

function PercentFieldGroup({
  title,
  hint,
  fields,
  values,
}: {
  title?: string;
  hint?: string;
  fields: PercentField[];
  values: Record<string, number>;
}) {
  return (
    <div>
      {title && <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>}
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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      {hint && <p className="mt-1 text-sm text-neutral-500">{hint}</p>}
      <div className="mt-4 space-y-6">{children}</div>
    </div>
  );
}

export function ParametrosClient({
  year,
  parameters,
}: {
  year: number;
  parameters: LegalParameters | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveLegalParameters, initialState);
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

  const values = (parameters ?? DEFAULT_LEGAL_PARAMETER_VALUES) as unknown as Record<
    string,
    number
  >;
  const shiftStart = parameters?.shift_start ?? DEFAULT_LEGAL_PARAMETER_VALUES.shift_start;
  const shiftEnd = parameters?.shift_end ?? DEFAULT_LEGAL_PARAMETER_VALUES.shift_end;
  const graceMinutes = parameters?.grace_minutes ?? DEFAULT_LEGAL_PARAMETER_VALUES.grace_minutes;
  const lunchBreakStart =
    parameters?.lunch_break_start ?? DEFAULT_LEGAL_PARAMETER_VALUES.lunch_break_start;
  const lunchBreakEnd =
    parameters?.lunch_break_end ?? DEFAULT_LEGAL_PARAMETER_VALUES.lunch_break_end;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Parámetros {year}</h1>
        <p className="text-sm text-neutral-500">
          Salario mínimo, factores de recargo, horario de jornada y aportes
          que usa el cálculo de nómina y reportes para {year}
          {!parameters && " — todavía no hay datos guardados para este año."}
        </p>
      </div>

      <form key={formKey} action={formAction} className="space-y-6">
        <input type="hidden" name="year" value={year} />

        <Section title="Ítems principales">
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
        </Section>

        <Section
          title="Factores de recargo y horas extra"
          hint="Multiplicador sobre la hora ordinaria (salario/240) — igual que la columna de cada tipo en la hoja HORAS EXTRAS de la plantilla."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="mt-1 text-xs text-neutral-400">{field.hint}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Parámetros de hora">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Horario de entrada y salida
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Tiempo de espera: una marcación de entrada anterior a la hora
              de entrada, o hasta ese margen de minutos después, se registra
              como la hora de entrada en punto — para no distorsionar el
              cálculo de horas trabajadas. Ejemplo: entrada 7:30 y tiempo de
              espera 15 min → cualquier marcación hasta las 7:45 se cuenta
              como 7:30. Solo aplica a la entrada, no a la salida.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Hora de entrada
                </label>
                <input
                  name="shift_start"
                  type="time"
                  required
                  defaultValue={shiftStart.slice(0, 5)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Tiempo de espera (minutos)
                </label>
                <input
                  name="grace_minutes"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={graceMinutes}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Hora de salida
                </label>
                <input
                  name="shift_end"
                  type="time"
                  required
                  defaultValue={shiftEnd.slice(0, 5)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Horario de almuerzo
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Se descuenta de las horas trabajadas en Reportes (hora muerta).
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
            <h3 className="text-sm font-semibold text-neutral-900">
              Jornada semanal legal
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Dato de referencia (Ley 2101 de 2021 / Ley 2466 de 2025): la
              jornada máxima baja a 42 horas semanales desde el 15 de julio
              de 2026. Todavía no se usa en el cálculo de horas extra, que
              sigue una jornada diaria fija de 8 horas.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Horas semanales
                </label>
                <input
                  name="weekly_legal_hours"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  defaultValue={values.weekly_legal_hours}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Seguridad social (salud, pensión, FSP)">
          <PercentFieldGroup fields={SOCIAL_SECURITY_FIELDS} values={values} />
        </Section>

        <Section title="Aportes parafiscales">
          <PercentFieldGroup fields={PARAFISCAL_FIELDS} values={values} />
        </Section>

        <Section title="Prestaciones sociales">
          <PercentFieldGroup fields={PRESTACIONES_FIELDS} values={values} />
        </Section>

        <Section
          title="ARL — riesgo profesional (nivel 1 a 5)"
          hint="El nivel de riesgo se asigna por trabajador en Trabajadores."
        >
          <PercentFieldGroup fields={ARL_FIELDS} values={values} />
        </Section>

        <Section title="Incapacidades">
          <PercentFieldGroup fields={[INCAPACIDAD_FIELD]} values={values} />
        </Section>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">
            Parámetros de {year} guardados.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Guardando..." : `Guardar parámetros de ${year}`}
        </button>
      </form>
    </div>
  );
}
