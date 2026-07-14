import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser } from "@fortawesome/free-solid-svg-icons";
import { COMPANY_NAME } from "@/lib/config";
import { Logo } from "@/components/Logo";
import type { Profile } from "@/lib/types";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";

export function Sidebar({
  profile,
  parameterYears = [],
}: {
  profile: Profile;
  parameterYears?: number[];
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
      <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4">
        <Logo className="h-9 w-9 shrink-0 object-contain" />
        <span className="truncate text-sm font-semibold text-neutral-800">
          {COMPANY_NAME}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks role={profile.role} vertical parameterYears={parameterYears} />
      </div>

      <div className="flex items-center gap-3 border-t border-neutral-200 px-5 py-4">
        <FontAwesomeIcon
          icon={faCircleUser}
          className="h-8 w-8 shrink-0 text-neutral-400"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-800">
            {profile.full_name}
          </p>
          <p className="text-xs capitalize text-neutral-500">
            {profile.role}
          </p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <SignOutButton />
      </div>
    </aside>
  );
}
