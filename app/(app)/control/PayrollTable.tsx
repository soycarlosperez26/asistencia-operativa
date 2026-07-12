"use client";

import { Fragment, useState } from "react";
import type { WorkerPayrollRow } from "@/lib/payroll";

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

export function PayrollTable({ rows }: { rows: WorkerPayrollRow[] }) {
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="bg-brand-dark text-xs uppercase text-white">
            <th className="rounded-l-lg px-3 py-2">Trabajador</th>
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
                  <button
                    onClick={() =>
                      setExpanded(expanded === row.workerId ? null : row.workerId)
                    }
                    className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {expanded === row.workerId ? "Ocultar" : "Detalle"}
                  </button>
                </td>
              </tr>
              {expanded === row.workerId && (
                <tr>
                  <td colSpan={9} className="bg-neutral-50 px-3 py-3">
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
                              <td className="py-1 pr-3 text-neutral-600">
                                {cat.factor}x
                              </td>
                              <td className="py-1 pr-3 text-neutral-900">
                                <Money value={cat.value} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
