import type { WorkedHoursSummary } from "@/lib/reports";

function StatTile({
  label,
  value,
  valueClassName = "text-neutral-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function ReportSummary({ summary }: { summary: WorkedHoursSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Trabajadores" value={String(summary.distinctWorkers)} />
      <StatTile label="Jornadas registradas" value={String(summary.totalSessions)} />
      <StatTile
        label="Horas trabajadas"
        value={summary.totalHoursWorked.toFixed(2)}
        valueClassName="text-brand-dark"
      />
      <StatTile
        label="Horas extras diurnas"
        value={summary.totalOvertimeDay.toFixed(2)}
        valueClassName="text-orange-600"
      />
      <StatTile
        label="Jornadas sin marcación"
        value={String(summary.missingCheckouts)}
        valueClassName={summary.missingCheckouts > 0 ? "text-red-600" : "text-neutral-900"}
      />
    </div>
  );
}
