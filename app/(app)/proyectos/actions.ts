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

export async function createSupervisor(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) {
    return { error: "No tienes permisos para crear supervisores." };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!projectId || !fullName || !email || password.length < 8) {
    return {
      error:
        "Completa proyecto, nombre y correo; la contraseña debe tener al menos 8 caracteres.",
    };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "No se pudo crear el usuario." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role: "supervisor",
    project_id: projectId,
  });

  if (profileError) {
    return { error: "Usuario creado, pero no se pudo asignar el perfil." };
  }

  revalidatePath("/proyectos");
  return { success: true };
}
