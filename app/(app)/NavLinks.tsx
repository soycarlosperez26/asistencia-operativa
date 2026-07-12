"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faChartColumn,
  faUsers,
  faDiagramProject,
  faGauge,
} from "@fortawesome/free-solid-svg-icons";
import type { UserRole } from "@/lib/types";

interface NavLinksProps {
  role: UserRole;
  vertical?: boolean;
  onNavigate?: () => void;
}

export function NavLinks({ role, vertical = false, onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    { href: "/asistencia", label: "Asistencia", icon: faClock },
    { href: "/reportes", label: "Reportes", icon: faChartColumn },
    ...(role === "admin"
      ? [
          { href: "/trabajadores", label: "Trabajadores", icon: faUsers },
          { href: "/proyectos", label: "Proyectos", icon: faDiagramProject },
          { href: "/control", label: "Control", icon: faGauge },
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-light text-brand-dark"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <FontAwesomeIcon icon={link.icon} className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
