import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { COMPANY_NAME } from "@/lib/config";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              {COMPANY_NAME.slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden text-sm font-semibold text-neutral-800 sm:block">
              {COMPANY_NAME}
            </span>
          </div>

          <NavLinks role={profile.role} />

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-neutral-800">
                {profile.full_name}
              </p>
              <p className="text-xs capitalize text-neutral-500">
                {profile.role}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
