"use client";

import { useState } from "react";
import type { Worker } from "@/lib/types";

function labelFor(worker: Pick<Worker, "full_name" | "document_id">): string {
  return `${worker.full_name} (${worker.document_id})`;
}

/** Combobox con datalist: búsqueda de trabajador por nombre o cédula. */
export function WorkerFilterField({
  workers,
  defaultWorkerId,
}: {
  workers: Pick<Worker, "id" | "full_name" | "document_id">[];
  defaultWorkerId?: string;
}) {
  const defaultWorker = workers.find((w) => w.id === defaultWorkerId);
  const [text, setText] = useState(defaultWorker ? labelFor(defaultWorker) : "");
  const [workerId, setWorkerId] = useState(defaultWorkerId ?? "");

  function handleChange(value: string) {
    setText(value);
    const match = workers.find((w) => labelFor(w) === value);
    setWorkerId(match ? match.id : "");
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        Trabajador (nombre o cédula)
      </label>
      <input
        list="worker-options"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Buscar..."
        autoComplete="off"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
      <datalist id="worker-options">
        {workers.map((worker) => (
          <option key={worker.id} value={labelFor(worker)} />
        ))}
      </datalist>
      <input type="hidden" name="worker" value={workerId} />
    </div>
  );
}
