"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { UserRole } from "@/lib/types";

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

export async function createUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) {
    return { error: "No tienes permisos para crear usuarios." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "supervisor") as UserRole;
  const projectId = String(formData.get("project_id") ?? "").trim() || null;

  if (!fullName || !email || password.length < 8) {
    return {
      error: "Completa nombre y correo; la contraseña debe tener al menos 8 caracteres.",
    };
  }
  if (role === "supervisor" && !projectId) {
    return { error: "Selecciona el proyecto del supervisor." };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    const message =
      createError?.message === "A user with this email address has already been registered"
        ? "Ya existe un usuario con ese correo."
        : createError?.message ?? "No se pudo crear el usuario.";
    return { error: message };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role,
    project_id: role === "supervisor" ? projectId : null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "No se pudo crear el perfil del usuario." };
  }

  revalidatePath("/usuarios");
  return { success: true };
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  projectId: string | null
): Promise<ActionState> {
  const profile = await requireAdmin();
  if (!profile) {
    return { error: "No tienes permisos para editar usuarios." };
  }
  if (profile.id === userId) {
    return { error: "No puedes cambiar tu propio rol." };
  }
  if (role === "supervisor" && !projectId) {
    return { error: "Selecciona el proyecto del supervisor." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role, project_id: role === "supervisor" ? projectId : null })
    .eq("id", userId);

  if (error) {
    return { error: "No se pudo actualizar el rol." };
  }

  revalidatePath("/usuarios");
  revalidatePath("/proyectos");
  return { success: true };
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<ActionState> {
  if (!(await requireAdmin())) {
    return { error: "No tienes permisos para editar usuarios." };
  }
  if (newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return { error: "No se pudo actualizar la contraseña." };
  }

  return { success: true };
}

export async function deleteUser(userId: string): Promise<ActionState> {
  const profile = await requireAdmin();
  if (!profile) {
    return { error: "No tienes permisos para eliminar usuarios." };
  }
  if (profile.id === userId) {
    return { error: "No puedes eliminar tu propia cuenta." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    return { error: "No se pudo eliminar el usuario." };
  }

  revalidatePath("/usuarios");
  revalidatePath("/proyectos");
  return { success: true };
}
