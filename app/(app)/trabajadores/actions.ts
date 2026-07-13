"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export interface WorkerFormState {
  error?: string;
  success?: boolean;
}

export interface WorkerSuggestion {
  id: string;
  full_name: string;
  document_id: string;
}

export async function searchWorkerSuggestions(query: string): Promise<WorkerSuggestion[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = await createClient();
  const [{ data: byName }, { data: byDoc }] = await Promise.all([
    supabase
      .from("workers")
      .select("id, full_name, document_id")
      .ilike("full_name", `%${trimmed}%`)
      .order("full_name")
      .limit(8),
    supabase
      .from("workers")
      .select("id, full_name, document_id")
      .ilike("document_id", `%${trimmed}%`)
      .order("full_name")
      .limit(8),
  ]);

  const byId = new Map<string, WorkerSuggestion>();
  for (const worker of [...(byName ?? []), ...(byDoc ?? [])]) {
    byId.set(worker.id, worker);
  }

  return [...byId.values()].slice(0, 8);
}

export async function createWorker(
  _prevState: WorkerFormState,
  formData: FormData
): Promise<WorkerFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "No tienes permisos para crear trabajadores." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const salaryRaw = String(formData.get("monthly_salary") ?? "").trim();
  const monthlySalary = salaryRaw ? Number(salaryRaw) : null;

  if (!fullName || !documentId) {
    return { error: "Nombre y documento son obligatorios." };
  }
  if (salaryRaw && (!Number.isFinite(monthlySalary) || (monthlySalary ?? -1) < 0)) {
    return { error: "El salario no es válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .insert({ full_name: fullName, document_id: documentId, monthly_salary: monthlySalary });

  if (error) {
    const message = error.code === "23505"
      ? "Ya existe un trabajador con ese documento."
      : "No se pudo crear el trabajador.";
    return { error: message };
  }

  revalidatePath("/trabajadores");
  return { success: true };
}

export async function toggleWorkerActive(workerId: string, active: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "No tienes permisos para editar trabajadores." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({ active })
    .eq("id", workerId);

  if (error) {
    return { error: "No se pudo actualizar el trabajador." };
  }

  revalidatePath("/trabajadores");
  return { success: true };
}

export async function updateWorkerSalary(workerId: string, monthlySalary: number) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "No tienes permisos para editar trabajadores." };
  }

  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    return { error: "El salario no es válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({ monthly_salary: monthlySalary })
    .eq("id", workerId);

  if (error) {
    return { error: "No se pudo actualizar el salario." };
  }

  revalidatePath("/trabajadores");
  revalidatePath("/control");
  return { success: true };
}
