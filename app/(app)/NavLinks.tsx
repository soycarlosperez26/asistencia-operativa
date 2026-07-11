"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";

export function NavLinks({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const links = [
    { href: "/asistencia", label: "Asistencia" },
    ...(role === "admin"
      ? [
          { href: "/trabajadores", label: "Trabajadores" },
          { href: "/proyectos", label: "Proyectos" },
        ]
      : []),
  ];

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
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
