"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";

export interface ActionState {
  error?: string;
  success?: boolean;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return null;
  }
  return profile;
}

export async function createProject(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) {
    return { error: "No tienes permisos para crear proyectos." };
  }

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!code || !name) {
    return { error: "Código y nombre son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({ code, name });

  if (error) {
    const message =
      error.code === "23505"
        ? "Ya existe un proyecto con ese código."
        : "No se pudo crear el proyecto.";
    return { error: message };
  }

  revalidatePath("/proyectos");
  return { success: true };
}

export async function toggleProjectActive(projectId: string, active: boolean) {
  if (!(await requireAdmin())) {
    return { error: "No tienes permisos para editar proyectos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ active })
    .eq("id", projectId);

  if (error) return { error: "No se pudo actualizar el proyecto." };

  revalidatePath("/proyectos");
  return { success: true };
}

export async function assignSupervisor(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) {
    return { error: "No tienes permisos para asignar supervisores." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!projectId || !userId) {
    return { error: "Selecciona un usuario para asignar." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "supervisor", project_id: projectId })
    .eq("id", userId);

  if (error) {
    return { error: "No se pudo asignar el supervisor." };
  }

  revalidatePath("/proyectos");
  revalidatePath("/usuarios");
  return { success: true };
}
