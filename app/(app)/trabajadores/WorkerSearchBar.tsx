"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchWorkerSuggestions, type WorkerSuggestion } from "./actions";

export function WorkerSearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<WorkerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Precarga la lista de trabajadores activos para que el desplegable tenga
  // contenido apenas se hace foco, sin esperar a que el usuario escriba.
  useEffect(() => {
    searchWorkerSuggestions("").then(setSuggestions);
  }, []);

  function navigate(query: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const qs = params.toString();
    router.push(qs ? `/trabajadores?${qs}` : "/trabajadores");
  }

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const results = await searchWorkerSuggestions(next);
      setSuggestions(results);
      setOpen(true);
      navigate(next);
    }, 300);
  }

  function selectSuggestion(suggestion: WorkerSuggestion) {
    setValue(suggestion.full_name);
    setOpen(false);
    navigate(suggestion.full_name);
  }

  return (
    <div ref={containerRef} className="relative sm:max-w-sm">
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        Buscar trabajador
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2 top-[27px] rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        aria-label="Mostrar todos los trabajadores activos"
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
      <input
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Nombre o documento..."
        autoComplete="off"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 pr-9 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
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
  );
}
