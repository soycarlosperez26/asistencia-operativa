"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchWorkerSuggestions, type WorkerSuggestion } from "./actions";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function WorkerSearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [allSuggestions, setAllSuggestions] = useState<WorkerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Precarga la lista de trabajadores activos una sola vez, para poder
  // filtrar el desplegable en el cliente sin golpear al servidor en cada
  // tecla que se escribe.
  useEffect(() => {
    searchWorkerSuggestions("").then(setAllSuggestions);
  }, []);

  const suggestions = useMemo(() => {
    const query = normalize(value);
    if (!query) return allSuggestions;
    return allSuggestions.filter(
      (w) =>
        normalize(w.full_name).includes(query) ||
        normalize(w.document_id).includes(query)
    );
  }, [value, allSuggestions]);

  function navigate(query: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const qs = params.toString();
    router.push(qs ? `/trabajadores?${qs}` : "/trabajadores");
  }

  // La búsqueda de la lista principal solo dispara al enviar el formulario
  // (botón "Buscar" o Enter), no en cada tecla, para evitar recargas
  // constantes de la página.
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setOpen(false);
    navigate(value);
  }

  function handleClear() {
    setValue("");
    setOpen(false);
    navigate("");
  }

  function selectSuggestion(suggestion: WorkerSuggestion) {
    setValue(suggestion.full_name);
    setOpen(false);
    navigate(suggestion.full_name);
  }

  return (
    <div ref={containerRef} className="sm:max-w-sm">
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        Buscar trabajador
      </label>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Nombre o documento..."
            autoComplete="off"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 pr-9 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Borrar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label="Mostrar todos los trabajadores activos"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          )}

          {open && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    <span className="font-medium text-neutral-900">
                      {suggestion.full_name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Doc: {suggestion.document_id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          className="shrink-0 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand"
        >
          Buscar
        </button>
      </form>
    </div>
  );
}
