"use client";

import { useCallback, useEffect, useState } from "react";
import { GPS_CACHE_MINUTES } from "@/lib/config";

export interface GpsReading {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: number;
}

const STORAGE_KEY = "registro-operativo:gps";
const CACHE_MS = GPS_CACHE_MINUTES * 60 * 1000;

function readCache(): GpsReading | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const reading = JSON.parse(raw) as GpsReading;
    if (Date.now() - reading.capturedAt > CACHE_MS) return null;
    return reading;
  } catch {
    return null;
  }
}

function writeCache(reading: GpsReading) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(reading));
  } catch {
    // sessionStorage no disponible (modo privado, etc.) — no bloquea el flujo.
  }
}

/**
 * Captura y cachea el GPS por GPS_CACHE_MINUTES, como respaldo informativo.
 * Con `enabled: false` no lee caché ni pide permiso de geolocalización
 * (usado para ocultar el GPS mientras es una funcionalidad premium).
 */
export function useGps(enabled: boolean = true) {
  const [reading, setReading] = useState<GpsReading | null>(() =>
    enabled ? readCache() : null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setError("Este dispositivo no soporta geolocalización.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: GpsReading = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: Date.now(),
        };
        writeCache(next);
        setReading(next);
        setError(null);
        setLoading(false);
      },
      () => {
        setError("No se pudo obtener la ubicación GPS.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [enabled]);

  useEffect(() => {
    if (enabled && !reading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- captura GPS al montar cuando no hay caché válida.
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { reading, error, loading, refresh };
}
