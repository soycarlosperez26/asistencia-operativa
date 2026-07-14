import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_NAME } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  let parameterYears: number[] = [];
  if (profile.role === "admin") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("legal_parameters")
      .select("year")
      .order("year", { ascending: false });
    parameterYears = (data ?? []).map((row) => row.year);
  }

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar profile={profile} parameterYears={parameterYears} />

      <div className="flex min-h-full flex-1 flex-col">
        <header className="border-b border-neutral-200 bg-white md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <MobileNav profile={profile} parameterYears={parameterYears} />
            <Logo className="h-9 w-9 shrink-0 object-contain" />
            <span className="truncate text-sm font-semibold text-neutral-800">
              {COMPANY_NAME}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
