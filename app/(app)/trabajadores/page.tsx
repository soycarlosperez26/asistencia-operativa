import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Worker } from "@/lib/types";
import { WorkersClient } from "./WorkersClient";

export default async function TrabajadoresPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/asistencia");

  const supabase = await createClient();
  const { data: workers } = await supabase
    .from("workers")
    .select("id, full_name, document_id, qr_token, active, created_at, monthly_salary")
    .order("full_name");

  return <WorkersClient workers={(workers as Worker[]) ?? []} />;
}
