"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark, faCircleUser } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/Logo";
import { COMPANY_NAME } from "@/lib/config";
import type { Profile } from "@/lib/types";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";

export function MobileNav({
  profile,
  parameterYears = [],
}: {
  profile: Profile;
  parameterYears?: number[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 md:hidden"
      >
        <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Logo className="h-8 w-8 shrink-0 object-contain" />
                <span className="truncate text-sm font-semibold text-neutral-800">
                  {COMPANY_NAME}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="shrink-0 text-neutral-400 hover:text-neutral-600"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex-1">
              <NavLinks
                role={profile.role}
                vertical
                onNavigate={() => setOpen(false)}
                parameterYears={parameterYears}
              />
            </div>

            <div className="flex items-center gap-3 border-t border-neutral-200 pt-4">
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
            <div className="mt-3">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
