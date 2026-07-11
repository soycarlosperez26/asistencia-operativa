"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";

interface NavLinksProps {
  role: UserRole;
  vertical?: boolean;
  onNavigate?: () => void;
}

export function NavLinks({ role, vertical = false, onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    { href: "/asistencia", label: "Asistencia" },
    { href: "/reportes", label: "Reportes" },
    ...(role === "admin"
      ? [
          { href: "/trabajadores", label: "Trabajadores" },
          { href: "/proyectos", label: "Proyectos" },
        ]
      : []),
  ];

  return (
    <nav
      className={
        vertical ? "flex flex-col gap-1" : "flex items-center gap-1"
      }
    >
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-light text-brand-dark"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
