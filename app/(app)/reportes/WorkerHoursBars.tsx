import type { WorkerHoursTotal } from "@/lib/reports";

export function WorkerHoursBars({ totals }: { totals: WorkerHoursTotal[] }) {
  if (totals.length === 0) return null;

  const max = Math.max(...totals.map((t) => t.hoursWorked), 1);

  return (
    <div className="space-y-2.5">
      {totals.map((total) => (
        <div key={total.workerId} className="flex items-center gap-3">
          <p className="w-36 shrink-0 truncate text-sm text-neutral-700 sm:w-48">
            {total.workerName}
          </p>
          <div className="h-5 flex-1 rounded-sm bg-neutral-100">
            <div
              className="h-5 rounded-r-sm bg-brand"
              style={{ width: `${Math.max((total.hoursWorked / max) * 100, 3)}%` }}
            />
          </div>
          <p className="w-14 shrink-0 text-right text-sm font-medium text-neutral-900">
            {total.hoursWorked.toFixed(1)}h
          </p>
        </div>
      ))}
    </div>
  );
}
