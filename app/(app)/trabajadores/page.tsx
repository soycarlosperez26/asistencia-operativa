import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Worker } from "@/lib/types";
import { WorkersClient } from "./WorkersClient";

const PAGE_SIZE = 15;

export type WorkerStatusFilter = "active" | "inactive" | "all";

interface TrabajadoresSearchParams {
  q?: string;
  page?: string;
  estado?: string;
}

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,()]/g, "");
}

function parseStatusFilter(value: string | undefined): WorkerStatusFilter {
  return value === "inactive" || value === "all" ? value : "active";
}

export default async function TrabajadoresPage({
  searchParams,
}: {
  searchParams: Promise<TrabajadoresSearchParams>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/asistencia");

  const supabase = await createClient();
  const query = (params.q ?? "").trim();
  const status = parseStatusFilter(params.estado);
  const orFilter = query
    ? `full_name.ilike.%${escapeOrFilterValue(query)}%,document_id.ilike.%${escapeOrFilterValue(query)}%`
    : null;

  let countQuery = supabase
    .from("workers")
    .select("id", { count: "exact", head: true });
  if (orFilter) countQuery = countQuery.or(orFilter);
  if (status !== "all") countQuery = countQuery.eq("active", status === "active");
  const { count } = await countQuery;

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(params.page) || 1), totalPages);

  let workersQuery = supabase
    .from("workers")
    .select(
      "id, full_name, document_id, qr_token, active, created_at, monthly_salary, birth_date, blood_type, email, phone, job_title, arl_risk_level, notes"
    )
    .order("full_name");
  if (orFilter) workersQuery = workersQuery.or(orFilter);
  if (status !== "all") workersQuery = workersQuery.eq("active", status === "active");

  const rangeFrom = (currentPage - 1) * PAGE_SIZE;
  const rangeTo = rangeFrom + PAGE_SIZE - 1;
  const { data: workers } = await workersQuery.range(rangeFrom, rangeTo);

  return (
    <WorkersClient
      workers={(workers as Worker[]) ?? []}
      totalCount={totalCount}
      page={currentPage}
      totalPages={totalPages}
      query={query}
      status={status}
    />
  );
}
