import { useEffect, useState, useCallback } from "react";
import type { Customer, CustomerState, ContactLog } from "./wallet-types";
import defaultData from "@/data/wallet.json";

const DATA_KEY = "wallet:data:v1";
const STATE_KEY = "wallet:state:v1";
const META_KEY = "wallet:meta:v1";

type Meta = { fileName?: string; uploadedAt?: string; count: number };

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function useWallet() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<Meta>({ count: 0 });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readJSON<Customer[] | null>(DATA_KEY, null);
    const m = readJSON<Meta>(META_KEY, {
      count: (defaultData as Customer[]).length,
      fileName: "محفظة شهر مايو 2026",
    });
    setCustomers(stored && stored.length ? stored : (defaultData as Customer[]));
    setMeta(m);
    setHydrated(true);
  }, []);

  const replaceData = useCallback((next: Customer[], fileName?: string) => {
    setCustomers(next);
    writeJSON(DATA_KEY, next);
    const m: Meta = {
      fileName: fileName || "ملف مرفوع",
      uploadedAt: new Date().toISOString(),
      count: next.length,
    };
    setMeta(m);
    writeJSON(META_KEY, m);
  }, []);

  const resetData = useCallback(() => {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(META_KEY);
    const def = defaultData as Customer[];
    setCustomers(def);
    setMeta({ count: def.length, fileName: "محفظة شهر مايو 2026" });
  }, []);

  return { customers, meta, hydrated, replaceData, resetData };
}

export function useCustomerStates() {
  const [states, setStates] = useState<Record<string, CustomerState>>({});

  useEffect(() => {
    setStates(readJSON<Record<string, CustomerState>>(STATE_KEY, {}));
  }, []);

  const update = useCallback(
    (key: string, patch: Partial<CustomerState>) => {
      setStates((prev) => {
        const cur = prev[key] || { contacted: false };
        const next = {
          ...prev,
          [key]: { ...cur, ...patch },
        };
        writeJSON(STATE_KEY, next);
        return next;
      });
    },
    [],
  );

  const addLog = useCallback((key: string, log: ContactLog) => {
    setStates((prev) => {
      const cur = prev[key] || { contacted: false };
      const next = {
        ...prev,
        [key]: {
          ...cur,
          contacted: true,
          lastContactedAt: log.date,
          logs: [...(cur.logs || []), log],
        },
      };
      writeJSON(STATE_KEY, next);
      return next;
    });
  }, []);

  return { states, update, addLog };
}
