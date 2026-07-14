"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({ name });

  if (error) {
    return { error: "No se pudo crear el proyecto." };
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

export async function deleteProject(projectId: string): Promise<ActionState> {
  if (!(await requireAdmin())) {
    return { error: "No tienes permisos para eliminar proyectos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    // Violación de FK: el proyecto tiene asistencia registrada.
    if (error.code === "23503") {
      return {
        error:
          "No se puede eliminar: tiene asistencia registrada. Archívalo en su lugar.",
      };
    }
    return { error: "No se pudo eliminar el proyecto." };
  }

  revalidatePath("/proyectos");
  return { success: true };
}
