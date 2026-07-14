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
  faSliders,
  faUsersGear,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import type { UserRole } from "@/lib/types";
import { toBogotaWallClock } from "@/lib/timezone";

interface NavLinksProps {
  role: UserRole;
  vertical?: boolean;
  onNavigate?: () => void;
  /** Años con parámetros legales guardados — arma el submenú de /parametros. */
  parameterYears?: number[];
}

function linkClass(active: boolean): string {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    active
      ? "bg-brand-light text-brand-dark"
      : "text-neutral-600 hover:bg-neutral-100"
  }`;
}

export function NavLinks({
  role,
  vertical = false,
  onNavigate,
  parameterYears = [],
}: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    { href: "/asistencia", label: "Registro Tiempos", icon: faClock },
    { href: "/reportes", label: "Reportes", icon: faChartColumn },
    ...(role === "admin"
      ? [
          { href: "/trabajadores", label: "Trabajadores", icon: faUsers },
          { href: "/proyectos", label: "Proyectos", icon: faDiagramProject },
          { href: "/nomina", label: "Nominas", icon: faGauge },
        ]
      : []),
  ];

  const currentYear = toBogotaWallClock(new Date()).getUTCFullYear();
  const availableParameterYears = [...new Set([...parameterYears, currentYear])].sort(
    (a, b) => b - a
  );
  const parametrosActive = pathname.startsWith("/parametros");

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
            className={linkClass(active)}
          >
            <FontAwesomeIcon icon={link.icon} className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}

      {role === "admin" && (
        <div>
          <Link
            href="/parametros"
            onClick={onNavigate}
            className={linkClass(parametrosActive)}
          >
            <FontAwesomeIcon icon={faSliders} className="h-4 w-4 shrink-0" />
            <span className="flex-1">Parámetros</span>
            {vertical && (
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`h-3 w-3 shrink-0 transition-transform ${
                  parametrosActive ? "rotate-180" : ""
                }`}
              />
            )}
          </Link>
          {vertical && parametrosActive && (
            <div className="ml-7 mt-1 flex flex-col gap-1 border-l border-neutral-200 pl-3">
              {availableParameterYears.map((year) => {
                const href = `/parametros/${year}`;
                const active = pathname === href;
                return (
                  <Link
                    key={year}
                    href={href}
                    onClick={onNavigate}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-brand-light text-brand-dark"
                        : "text-neutral-500 hover:bg-neutral-100"
                    }`}
                  >
                    {year}
                    {!parameterYears.includes(year) && (
                      <span className="ml-1 text-xs opacity-70">(nuevo)</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {role === "admin" && (
        <Link
          href="/usuarios"
          onClick={onNavigate}
          className={linkClass(pathname.startsWith("/usuarios"))}
        >
          <FontAwesomeIcon icon={faUsersGear} className="h-4 w-4 shrink-0" />
          Usuarios
        </Link>
      )}
    </nav>
  );
}
