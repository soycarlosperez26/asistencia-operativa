import Link from "next/link";

function buildHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
  pageParam: string
): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== "" && key !== pageParam) {
      usp.set(key, value);
    }
  }
  if (page > 1) usp.set(pageParam, String(page));
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
  totalItems,
  pageParam = "page",
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  totalItems?: number;
  pageParam?: string;
}) {
  if (totalPages <= 1) return null;

  const prevHref =
    page > 1 ? buildHref(basePath, searchParams, page - 1, pageParam) : null;
  const nextHref =
    page < totalPages
      ? buildHref(basePath, searchParams, page + 1, pageParam)
      : null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-neutral-500">
        Página {page} de {totalPages}
        {totalItems !== undefined && ` · ${totalItems} resultados`}
      </p>
      <div className="flex gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Anterior
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-300">
            Anterior
          </span>
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Siguiente
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-300">
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}
