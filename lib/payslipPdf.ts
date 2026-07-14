import type { WorkerPayrollRow } from "@/lib/payroll";

/**
 * Genera el "volante de pago" (finiquito) de un trabajador en PDF.
 * Mismos conceptos y mismo orden que la hoja "FINIQUITOS" de la plantilla
 * Excel de nómina, con un layout más cuidado (colores de marca, tarjetas
 * de resumen, tabla con cebra) en vez de la grilla plana del Excel.
 *
 * Fila "recargo dominical nocturno (1,1)" queda siempre en 0: la plantilla
 * la trae, pero el motor de cálculo (lib/payroll.ts) no la calcula todavía
 * (ver comentario en buildCategories).
 */

// Paleta de marca (ver app/globals.css: --brand, --brand-dark, --brand-light)
const BRAND: [number, number, number] = [28, 127, 150];
const BRAND_DARK: [number, number, number] = [14, 58, 74];
const BRAND_LIGHT: [number, number, number] = [229, 243, 245];
const GRID: [number, number, number] = [214, 224, 227];
const TEXT_DARK: [number, number, number] = [38, 46, 48];
const TEXT_MUTED: [number, number, number] = [110, 125, 129];

function formatCOP(value: number): string {
  return `$ ${Math.round(value).toLocaleString("en-US")}`;
}

function formatUnits(value: number): string {
  return value.toFixed(1);
}

export async function generatePayslipPdf(
  row: WorkerPayrollRow,
  options: { from: string; to: string; companyName: string }
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const byKey = new Map(row.categories.map((c) => [c.key, c]));
  const hed = byKey.get("hed");
  const hen = byKey.get("hen");
  const rn = byKey.get("rn");
  const hfd = byKey.get("hfd");
  const hfn = byKey.get("hfn");
  const hefd = byKey.get("hefd");
  const hefn = byKey.get("hefn");

  const totalExtraHours =
    (hed?.hours ?? 0) +
    (hen?.hours ?? 0) +
    (rn?.hours ?? 0) +
    (hfd?.hours ?? 0) +
    (hfn?.hours ?? 0) +
    (hefd?.hours ?? 0) +
    (hefn?.hours ?? 0);

  type ConceptRow = {
    label: string;
    units?: number;
    devengado?: number | "-";
    descontado?: number | "-";
  };

  const conceptRows: ConceptRow[] = [
    { label: "Ingreso", devengado: row.basico },
    { label: "Subsidio transporte", devengado: row.transportAllowance },
    { label: "Extras diurnas (1,25)", units: hed?.hours ?? 0, devengado: hed?.value ?? 0 },
    { label: "Extras Nocturno (1,75)", units: hen?.hours ?? 0, devengado: hen?.value ?? 0 },
    { label: "Recargo Nocturno (0,35)", units: rn?.hours ?? 0, devengado: rn?.value ?? 0 },
    { label: "Hora festivas (1,80)", units: hfd?.hours ?? 0, devengado: hfd?.value ?? 0 },
    { label: "Recargo dominical nocturno (1,1)", units: 0, devengado: 0 },
    { label: "Hora festivas nocturna (2,1)", units: hfn?.hours ?? 0, devengado: hfn?.value ?? 0 },
    { label: "Extras festivas diurnas (2,0)", units: hefd?.hours ?? 0, devengado: hefd?.value ?? 0 },
    { label: "Extras festivas nocturnas (2,5)", units: hefn?.hours ?? 0, devengado: hefn?.value ?? 0 },
    { label: "Subsidio alimentación", devengado: row.lunchSubsidy },
    { label: "Incapacidades", devengado: row.incapacidad },
    { label: "Otros", devengado: 0 },
    ...(row.includePrimas
      ? [{ label: "Primas de servicios", devengado: row.primas }]
      : []),
    { label: "Descuento salud", descontado: row.healthDeduction },
    { label: "Descuento pensión", descontado: row.pensionDeduction },
    { label: "Descuento FSP", descontado: row.fspDeduction },
    { label: "Descuento almuerzos", devengado: "-", descontado: 0 },
    { label: "Descuento préstamos", devengado: "-", descontado: 0 },
  ];

  const totalDevengado = conceptRows.reduce(
    (sum, r) => sum + (typeof r.devengado === "number" ? r.devengado : 0),
    0
  );
  const totalDescontado = conceptRows.reduce(
    (sum, r) => sum + (typeof r.descontado === "number" ? r.descontado : 0),
    0
  );
  const valorAPagar = totalDevengado - totalDescontado;

  // --- Geometría general ---
  const left = 15;
  const width = 180;
  const right = left + width;
  const rowH = 6;

  const colConceptos = left; // 15 -> 110
  const colUnidades = left + 95; // 110 -> 135
  const colDevengado = colUnidades + 25; // 135 -> 165
  const colDescontado = colDevengado + 30; // 165 -> 195

  doc.setDrawColor(...GRID);

  // --- Encabezado ---
  let y = 15;
  doc.setFillColor(...BRAND_DARK);
  doc.roundedRect(left, y, width, 20, 2.5, 2.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("VOLANTE DE PAGO", left + width / 2, y + 6, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(options.companyName.toUpperCase(), left + width / 2, y + 12.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nómina del ${options.from} al ${options.to}`, left + width / 2, y + 17.5, {
    align: "center",
  });
  y += 20 + 5;

  // --- Tarjeta: datos del trabajador ---
  const infoCardH = 28;
  doc.setFillColor(...BRAND_LIGHT);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.3);
  doc.roundedRect(left, y, width, infoCardH, 2.5, 2.5, "FD");

  const padX = 6;

  function infoField(x: number, labelY: number, label: string, value: string, align: "left" | "right") {
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text(label, x, labelY, { align });
    doc.setTextColor(...BRAND_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(value, x, labelY + 5, { align });
  }

  infoField(left + padX, y + 7, "TRABAJADOR", row.workerName, "left");
  infoField(left + padX, y + 18.5, "CÉDULA DE CIUDADANÍA", row.documentId || "-", "left");
  infoField(right - padX, y + 7, "DÍAS TRABAJADOS", String(row.daysWorked), "right");
  infoField(right - padX, y + 18.5, "N.° HORAS EXTRAS", formatUnits(totalExtraHours), "right");

  y += infoCardH + 4;

  // --- Tarjeta: valor a pagar ---
  doc.setFillColor(...BRAND);
  doc.roundedRect(left, y, width, 14, 2.5, 2.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VALOR A PAGAR", left + padX, y + 9);
  doc.setFontSize(15);
  doc.text(formatCOP(valorAPagar), right - padX, y + 9.5, { align: "right" });
  y += 14 + 6;

  // --- Tabla de conceptos ---
  const tableTop = y;
  doc.setFillColor(...BRAND_DARK);
  doc.rect(left, y, width, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CONCEPTOS", colConceptos + 3, y + 4.6);
  doc.text("UNIDADES", colDevengado - 3, y + 4.6, { align: "right" });
  doc.text("DEVENGADO", colDescontado - 3, y + 4.6, { align: "right" });
  doc.text("DESCONTADO", right - 3, y + 4.6, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  conceptRows.forEach((concept, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(...BRAND_LIGHT);
      doc.rect(left, y, width, rowH, "F");
    }
    doc.setTextColor(...TEXT_DARK);
    doc.text(concept.label, colConceptos + 3, y + rowH / 2 + 1.1);
    if (concept.units !== undefined) {
      doc.text(formatUnits(concept.units), colDevengado - 3, y + rowH / 2 + 1.1, { align: "right" });
    }
    if (concept.devengado !== undefined) {
      const text = typeof concept.devengado === "number" ? formatCOP(concept.devengado) : concept.devengado;
      doc.text(text, colDescontado - 3, y + rowH / 2 + 1.1, { align: "right" });
    }
    if (concept.descontado !== undefined) {
      const text = typeof concept.descontado === "number" ? formatCOP(concept.descontado) : concept.descontado;
      doc.text(text, right - 3, y + rowH / 2 + 1.1, { align: "right" });
    }
    y += rowH;
  });

  // Divisores verticales de la tabla completa (encabezado + filas)
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.25);
  doc.line(colUnidades, tableTop, colUnidades, y);
  doc.line(colDevengado, tableTop, colDevengado, y);
  doc.line(colDescontado, tableTop, colDescontado, y);
  doc.setLineWidth(0.3);
  doc.rect(left, tableTop, width, y - tableTop);

  // --- Total devengado/descontado ---
  doc.setLineWidth(0.4);
  doc.setDrawColor(...BRAND_DARK);
  doc.line(left, y, right, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND_DARK);
  doc.text("TOTAL DEVENGADO / DESCONTADO", colConceptos + 3, y + rowH / 2 + 1.3);
  doc.text(formatCOP(totalDevengado), colDescontado - 3, y + rowH / 2 + 1.3, { align: "right" });
  doc.text(formatCOP(totalDescontado), right - 3, y + rowH / 2 + 1.3, { align: "right" });
  y += rowH + 6;

  // --- Firma ---
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.3);
  doc.roundedRect(left, y, width, 18, 2.5, 2.5, "D");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("RECIBÍ CONFORME", left + padX, y + 6);
  doc.setDrawColor(...TEXT_MUTED);
  doc.setLineWidth(0.2);
  doc.line(left + padX, y + 13, left + 105, y + 13);
  doc.line(left + 118, y + 13, right - padX, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Firma del trabajador", left + padX, y + 16.5);
  doc.text("C.C.", left + 118, y + 16.5);

  const fileSafeName = row.workerName.trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`volante-pago-${fileSafeName}-${options.from}-a-${options.to}.pdf`);
}
