"use client";

import type { WorkedHoursRow } from "@/lib/reports";
import { formatReportDate, formatReportTime } from "@/lib/reports";

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportExcelButton({ rows }: { rows: WorkedHoursRow[] }) {
  function handleExport() {
    const headers = [
      "Trabajador",
      "Documento",
      "Proyecto",
      "Fecha",
      "Entrada",
      "Salida",
      "Horas Trabajadas",
      "Horas Extras Diurnas",
    ];

    const lines = rows.map((row) =>
      [
        row.workerName,
        row.documentId,
        `${row.projectCode} - ${row.projectName}`,
        formatReportDate(row.date),
        formatReportTime(row.entradaAt),
        row.salidaAt ? formatReportTime(row.salidaAt) : "Sin Marcación",
        row.hoursWorked?.toFixed(2) ?? "",
        row.overtimeDay?.toFixed(2) ?? "",
      ]
        .map((value) => csvEscape(String(value)))
        .join(";")
    );

    const csv = [headers.join(";"), ...lines].join("\r\n");
    // BOM para que Excel detecte UTF-8 y muestre bien los acentos/ñ.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `horas-trabajadas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={rows.length === 0}
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
      Exportar Excel
    </button>
  );
}
