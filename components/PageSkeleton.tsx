export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-neutral-200" />
        <div className="h-4 w-72 rounded bg-neutral-200" />
      </div>
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <div className="h-4 w-32 rounded bg-neutral-200" />
        <div className="h-10 w-full rounded bg-neutral-100" />
        <div className="h-10 w-full rounded bg-neutral-100" />
        <div className="h-10 w-full rounded bg-neutral-100" />
      </div>
    </div>
  );
}
