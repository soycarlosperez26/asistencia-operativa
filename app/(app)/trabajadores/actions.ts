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

  if (!fullName || !documentId) {
    return { error: "Nombre y documento son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .insert({ full_name: fullName, document_id: documentId });

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
