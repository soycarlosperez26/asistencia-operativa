"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export interface WorkerFormState {
  error?: string;
  success?: boolean;
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
