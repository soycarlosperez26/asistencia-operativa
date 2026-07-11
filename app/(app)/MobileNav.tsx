"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { COMPANY_NAME } from "@/lib/config";
import type { Profile } from "@/lib/types";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";

export function MobileNav({ profile }: { profile: Profile }) {
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-5 w-5"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
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
                ✕
              </button>
            </div>

            <div className="mt-6 flex-1">
              <NavLinks
                role={profile.role}
                vertical
                onNavigate={() => setOpen(false)}
              />
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <p className="text-sm font-medium text-neutral-800">
                {profile.full_name}
              </p>
              <p className="text-xs capitalize text-neutral-500">
                {profile.role}
              </p>
              <div className="mt-3">
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
