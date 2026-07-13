"use client";

import type { PayrollByProject, WorkerPayrollRow } from "@/lib/payroll";

const CATEGORY_ORDER = ["hed", "hen", "rn", "hfd", "hfn", "hefd", "hefn"] as const;

function sanitizeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "Proyecto";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base.slice(0, 28)} ${suffix}`;
    suffix += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function buildProjectSheetRows(rows: WorkerPayrollRow[], from: string, to: string) {
  const header = [
    "N°",
    "Documento",
    "Trabajador",
    "Salario mensual",
    "Días laborados",
    "Básico",
    "HED horas",
    "HED valor",
    "HEN horas",
    "HEN valor",
    "RN horas",
    "RN valor",
    "HFD horas",
    "HFD valor",
    "HFN horas",
    "HFN valor",
    "HEFD horas",
    "HEFD valor",
    "HEFN horas",
    "HEFN valor",
    "Total extras",
    "Auxilio transporte",
    "Subsidio almuerzo",
    "Total devengado",
    "Salud",
    "Pensión",
    "Neto a pagar",
  ];

  const dataRows = rows.map((row, index) => {
    const byCode = new Map(row.categories.map((c) => [c.key, c]));
    const categoryCells = CATEGORY_ORDER.flatMap((key) => {
      const cat = byCode.get(key);
      return [cat?.hours ?? 0, cat?.value ?? 0];
    });
    return [
      index + 1,
      row.documentId,
      row.workerName + (row.missingSalary ? " (sin salario cargado)" : ""),
      row.monthlySalary ?? 0,
      row.daysWorked,
      row.basico,
      ...categoryCells,
      row.extrasTotal,
      row.transportAllowance,
      row.lunchSubsidy,
      row.totalEarned,
      row.healthDeduction,
      row.pensionDeduction,
      row.netPay,
    ];
  });

  const totalsRow = [
    "",
    "",
    "TOTAL",
    "",
    "",
    rows.reduce((s, r) => s + r.basico, 0),
    ...CATEGORY_ORDER.flatMap((key) => {
      const hours = rows.reduce(
        (s, r) => s + (r.categories.find((c) => c.key === key)?.hours ?? 0),
        0
      );
      const value = rows.reduce(
        (s, r) => s + (r.categories.find((c) => c.key === key)?.value ?? 0),
        0
      );
      return [hours, value];
    }),
    rows.reduce((s, r) => s + r.extrasTotal, 0),
    rows.reduce((s, r) => s + r.transportAllowance, 0),
    rows.reduce((s, r) => s + r.lunchSubsidy, 0),
    rows.reduce((s, r) => s + r.totalEarned, 0),
    rows.reduce((s, r) => s + r.healthDeduction, 0),
    rows.reduce((s, r) => s + r.pensionDeduction, 0),
    rows.reduce((s, r) => s + r.netPay, 0),
  ];

  return [
    [`Nómina — período ${from} a ${to}`],
    [],
    header,
    ...dataRows,
    [],
    totalsRow,
  ];
}

export function PayrollExcelExport({
  from,
  to,
  payrollByProject,
}: {
  from: string;
  to: string;
  payrollByProject: PayrollByProject[];
}) {
  const disabled = payrollByProject.length === 0;

  async function handleExport() {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    const summaryHeader = [
      "Proyecto",
      "Código",
      "Trabajadores",
      "Total básico",
      "Total extras",
      "Costo nómina (neto)",
      "Sin salario cargado",
    ];
    const summaryRows = payrollByProject.map((p) => [
      p.project.name,
      p.project.code,
      p.summary.workersCount,
      p.summary.totalBasico,
      p.summary.totalExtras,
      p.summary.totalNomina,
      p.summary.workersMissingSalary,
    ]);
    const summarySheet = XLSX.utils.aoa_to_sheet([
      [`Resumen general — período ${from} a ${to}`],
      [],
      summaryHeader,
      ...summaryRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen general");

    const usedNames = new Set<string>(["resumen general"]);
    for (const entry of payrollByProject) {
      const sheet = XLSX.utils.aoa_to_sheet(
        buildProjectSheetRows(entry.rows, from, to)
      );
      const sheetName = sanitizeSheetName(entry.project.code, usedNames);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    }

    XLSX.writeFile(workbook, `nomina-por-proyecto-${from}-a-${to}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
      title={
        disabled
          ? "No hay nómina calculada en el período para exportar."
          : undefined
      }
      className="flex items-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand disabled:opacity-60"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
      </svg>
      Exportar consolidado por proyecto
    </button>
  );
}
