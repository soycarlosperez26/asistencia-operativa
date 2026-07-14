"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Worker } from "@/lib/types";

type WorkerOption = Pick<Worker, "id" | "full_name" | "document_id">;

function labelFor(worker: WorkerOption): string {
  return `${worker.full_name} (${worker.document_id})`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Combobox propio: búsqueda de trabajador por nombre o cédula, con dropdown y scroll. */
export function WorkerFilterField({
  workers,
  defaultWorkerId,
}: {
  workers: WorkerOption[];
  defaultWorkerId?: string;
}) {
  const defaultWorker = workers.find((w) => w.id === defaultWorkerId);
  const [text, setText] = useState(defaultWorker ? labelFor(defaultWorker) : "");
  const [workerId, setWorkerId] = useState(defaultWorkerId ?? "");
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

  const filtered = useMemo(() => {
    const query = normalize(text);
    if (!query) return workers;
    return workers.filter(
      (w) =>
        normalize(w.full_name).includes(query) ||
        normalize(w.document_id).includes(query)
    );
  }, [text, workers]);

  function handleChange(value: string) {
    setText(value);
    setWorkerId("");
    setOpen(true);
  }

  function selectWorker(worker: WorkerOption) {
    setText(labelFor(worker));
    setWorkerId(worker.id);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        Trabajador (nombre o cédula)
      </label>
      <input
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Buscar..."
        autoComplete="off"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
      <input type="hidden" name="worker" value={workerId} />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {filtered.map((worker) => (
            <li key={worker.id}>
              <button
                type="button"
                onClick={() => selectWorker(worker)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                {labelFor(worker)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
