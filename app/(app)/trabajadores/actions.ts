"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { BloodType } from "@/lib/types";

export interface WorkerFormState {
  error?: string;
  success?: boolean;
}

export interface WorkerSuggestion {
  id: string;
  full_name: string;
  document_id: string;
  active: boolean;
}

const BLOOD_TYPES: BloodType[] = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

/**
 * Sugerencias del buscador desplegable: con texto, busca por nombre o
 * documento; sin texto, devuelve todos los trabajadores activos.
 */
export async function searchWorkerSuggestions(query: string): Promise<WorkerSuggestion[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return [];

  const supabase = await createClient();
  const trimmed = query.trim();

  if (!trimmed) {
    const { data } = await supabase
      .from("workers")
      .select("id, full_name, document_id, active")
      .eq("active", true)
      .order("full_name")
      .limit(50);
    return data ?? [];
  }

  const [{ data: byName }, { data: byDoc }] = await Promise.all([
    supabase
      .from("workers")
      .select("id, full_name, document_id, active")
      .ilike("full_name", `%${trimmed}%`)
      .order("full_name")
      .limit(8),
    supabase
      .from("workers")
      .select("id, full_name, document_id, active")
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
  const birthDate = String(formData.get("birth_date") ?? "").trim() || null;
  const bloodTypeRaw = String(formData.get("blood_type") ?? "").trim();
  const bloodType = BLOOD_TYPES.includes(bloodTypeRaw as BloodType)
    ? (bloodTypeRaw as BloodType)
    : null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const jobTitle = String(formData.get("job_title") ?? "").trim() || null;

  if (!fullName || !documentId) {
    return { error: "Nombre y documento son obligatorios." };
  }
  if (salaryRaw && (!Number.isFinite(monthlySalary) || (monthlySalary ?? -1) < 0)) {
    return { error: "El salario no es válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workers").insert({
    full_name: fullName,
    document_id: documentId,
    monthly_salary: monthlySalary,
    birth_date: birthDate,
    blood_type: bloodType,
    email,
    phone,
    job_title: jobTitle,
  });

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

export async function updateWorker(
  _prevState: WorkerFormState,
  formData: FormData
): Promise<WorkerFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "No tienes permisos para editar trabajadores." };
  }

  const workerId = String(formData.get("id") ?? "").trim();
  if (!workerId) {
    return { error: "Trabajador no válido." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const salaryRaw = String(formData.get("monthly_salary") ?? "").trim();
  const monthlySalary = salaryRaw ? Number(salaryRaw) : null;
  const birthDate = String(formData.get("birth_date") ?? "").trim() || null;
  const bloodTypeRaw = String(formData.get("blood_type") ?? "").trim();
  const bloodType = BLOOD_TYPES.includes(bloodTypeRaw as BloodType)
    ? (bloodTypeRaw as BloodType)
    : null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const jobTitle = String(formData.get("job_title") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const arlRiskLevel = Number(formData.get("arl_risk_level"));

  if (!fullName || !documentId) {
    return { error: "Nombre y documento son obligatorios." };
  }
  if (salaryRaw && (!Number.isFinite(monthlySalary) || (monthlySalary ?? -1) < 0)) {
    return { error: "El salario no es válido." };
  }
  if (!Number.isInteger(arlRiskLevel) || arlRiskLevel < 1 || arlRiskLevel > 5) {
    return { error: "El nivel de riesgo ARL no es válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({
      full_name: fullName,
      document_id: documentId,
      monthly_salary: monthlySalary,
      birth_date: birthDate,
      blood_type: bloodType,
      email,
      phone,
      job_title: jobTitle,
      arl_risk_level: arlRiskLevel,
      notes,
    })
    .eq("id", workerId);

  if (error) {
    const message = error.code === "23505"
      ? "Ya existe un trabajador con ese documento."
      : "No se pudo actualizar el trabajador.";
    return { error: message };
  }

  revalidatePath("/trabajadores");
  revalidatePath("/nomina");
  return { success: true };
}
