import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Profile } from "@/lib/types";
import { UsersClient, type UserRow } from "./UsersClient";

export default async function UsuariosPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/asistencia");

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authUsers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("full_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailById = new Map(
    (authUsers?.users ?? []).map((user) => [user.id, user.email ?? ""])
  );

  const users: UserRow[] = ((profiles as Profile[]) ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "",
  }));

  return <UsersClient users={users} currentUserId={profile.id} />;
}
