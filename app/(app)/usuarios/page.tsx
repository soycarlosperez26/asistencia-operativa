import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Profile, Project } from "@/lib/types";
import { UsersClient, type UserRow } from "./UsersClient";

export default async function UsuariosPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/asistencia");

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: projects }, { data: authUsers }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, project_id, created_at")
        .order("full_name"),
      supabase.from("projects").select("id, code, name, active, created_at").order("code"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const emailById = new Map(
    (authUsers?.users ?? []).map((user) => [user.id, user.email ?? ""])
  );

  const users: UserRow[] = ((profiles as Profile[]) ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "",
  }));

  return (
    <UsersClient
      users={users}
      projects={(projects as Project[]) ?? []}
      currentUserId={profile.id}
    />
  );
}
