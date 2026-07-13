"use client";

import { Fragment, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";
import type { WorkerPayrollRow } from "@/lib/payroll";
import { generatePayslipPdf } from "@/lib/payslipPdf";
import { COMPANY_NAME } from "@/lib/config";

function currency(value: number): string {
  return value.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={className}>{currency(value)}</span>;
}

function CategoryList({ row }: { row: WorkerPayrollRow }) {
  return (
    <>
      <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">
        Horas extra y recargos — {row.workerName}
      </p>
      <ul className="divide-y divide-neutral-200 text-xs">
        {row.categories.map((cat) => (
          <li
            key={cat.key}
            className="flex items-center justify-between gap-2 py-1.5"
          >
            <div>
              <p className="font-medium text-neutral-800">
                {cat.code} — {cat.label}
              </p>
              <p className="text-neutral-500">
                {cat.hours.toFixed(2)} h · {cat.factor}x
              </p>
            </div>
            <Money value={cat.value} className="font-medium text-neutral-900" />
          </li>
        ))}
      </ul>
    </>
  );
}

function CategoryTable({ row }: { row: WorkerPayrollRow }) {
  return (
    <>
      <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">
        Horas extra y recargos — {row.workerName}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead>
            <tr className="text-neutral-500">
              <th className="py-1 pr-3">Categoría</th>
              <th className="py-1 pr-3">Horas</th>
              <th className="py-1 pr-3">Factor</th>
              <th className="py-1 pr-3">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {row.categories.map((cat) => (
              <tr key={cat.key}>
                <td className="py-1 pr-3 font-medium text-neutral-800">
                  {cat.code} — {cat.label}
                </td>
                <td className="py-1 pr-3 text-neutral-600">
                  {cat.hours.toFixed(2)}
                </td>
                <td className="py-1 pr-3 text-neutral-600">{cat.factor}x</td>
                <td className="py-1 pr-3 text-neutral-900">
                  <Money value={cat.value} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PayslipButton({
  row,
  from,
  to,
  className = "",
}: {
  row: WorkerPayrollRow;
  from: string;
  to: string;
  className?: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function showTooltip() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
  }

  function hideTooltip() {
    setTooltipPos(null);
  }

  async function handleClick() {
    setGenerating(true);
    try {
      await generatePayslipPdf(row, { from, to, companyName: COMPANY_NAME });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        disabled={generating}
        aria-label="Volante de pago"
        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 text-red-600 hover:bg-neutral-50 disabled:cursor-default disabled:opacity-60 ${className}`}
      >
        <FontAwesomeIcon
          icon={faFilePdf}
          className={generating ? "h-4 w-4 animate-pulse" : "h-4 w-4"}
        />
      </button>
      {tooltipPos &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white shadow-sm"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            {generating ? "Generando..." : "Volante de pago"}
          </span>,
          document.body
        )}
    </>
  );
}

export function PayrollTable({
  rows,
  from,
  to,
}: {
  rows: WorkerPayrollRow[];
  from: string;
  to: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No hay marcaciones completas (entrada y salida) en el período
        seleccionado.
      </p>
    );
  }

  return (
    <div>
      {/* Mobile: stacked cards (avoids horizontal scroll on narrow screens) */}
      <ul className="divide-y divide-neutral-100 sm:hidden">
        {rows.map((row) => (
          <li key={row.workerId} className="py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-900">
                  {row.workerName}
                </p>
                {row.missingSalary && (
                  <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    Sin salario cargado
                  </span>
                )}
                <p className="mt-0.5 text-xs text-neutral-500">
                  {row.daysWorked} días trabajados
                  {row.projectCodes.length > 0 &&
                    ` · ${row.projectCodes.join(", ")}`}
                </p>
              </div>
              <Money
                value={row.netPay}
                className="shrink-0 font-semibold text-brand-dark"
              />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-600">
              <div>
                <dt className="text-neutral-400">Básico</dt>
                <dd className="text-neutral-900">
                  <Money value={row.basico} />
                </dd>
              </div>
              <div>
                <dt className="text-neutral-400">Extras</dt>
                <dd className="text-orange-600">
                  <Money value={row.extrasTotal} />
                </dd>
              </div>
              <div>
                <dt className="text-neutral-400">Transporte</dt>
                <dd>
                  <Money value={row.transportAllowance} />
                </dd>
              </div>
              <div>
                <dt className="text-neutral-400">Salud</dt>
                <dd>
                  <Money value={row.healthDeduction} />
                </dd>
              </div>
              <div>
                <dt className="text-neutral-400">Pensión</dt>
                <dd>
                  <Money value={row.pensionDeduction} />
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() =>
                  setExpanded(expanded === row.workerId ? null : row.workerId)
                }
                className="flex-1 cursor-pointer rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {expanded === row.workerId ? "Ocultar detalle" : "Ver detalle"}
              </button>
              <PayslipButton row={row} from={from} to={to} />
            </div>

            {expanded === row.workerId && (
              <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                <CategoryList row={row} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Tablet/desktop: full table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead>
            <tr className="bg-brand-dark text-xs uppercase text-white">
              <th className="rounded-l-lg px-3 py-2">Trabajador</th>
              <th className="px-3 py-2">Proyecto</th>
              <th className="px-3 py-2">Días</th>
              <th className="px-3 py-2">Básico</th>
              <th className="px-3 py-2">Extras</th>
              <th className="px-3 py-2">Transporte</th>
              <th className="px-3 py-2">Salud</th>
              <th className="px-3 py-2">Pensión</th>
              <th className="px-3 py-2">Neto a pagar</th>
              <th className="rounded-r-lg px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <Fragment key={row.workerId}>
                <tr>
                  <td className="px-3 py-2 font-medium text-neutral-900">
                    {row.workerName}
                    {row.missingSalary && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Sin salario cargado
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {row.projectCodes.length > 0
                      ? row.projectCodes.join(", ")
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{row.daysWorked}</td>
                  <td className="px-3 py-2 text-neutral-900">
                    <Money value={row.basico} />
                  </td>
                  <td className="px-3 py-2 text-orange-600">
                    <Money value={row.extrasTotal} />
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    <Money value={row.transportAllowance} />
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    <Money value={row.healthDeduction} />
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    <Money value={row.pensionDeduction} />
                  </td>
                  <td className="px-3 py-2 font-semibold text-brand-dark">
                    <Money value={row.netPay} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setExpanded(expanded === row.workerId ? null : row.workerId)
                        }
                        className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                      >
                        {expanded === row.workerId ? "Ocultar" : "Detalle"}
                      </button>
                      <PayslipButton row={row} from={from} to={to} />
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
