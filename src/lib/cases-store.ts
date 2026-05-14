import { useEffect, useState } from "react";

export type CaseRecord = Record<string, any>;

type CasesData = {
  columns: string[];
  rows: any[][];
  records: CaseRecord[];
  byCustomerId: Map<string, CaseRecord[]>;
  byAccount: Map<string, CaseRecord[]>;
  byCaseNo: Map<string, CaseRecord[]>;
};

let cache: CasesData | null = null;
let loading: Promise<CasesData> | null = null;

async function loadCases(): Promise<CasesData> {
  if (cache) return cache;
  if (loading) return loading;
  loading = (async () => {
    const res = await fetch("/cases.json");
    if (!res.ok) throw new Error("تعذّر تحميل ملف القضايا");
    const json = (await res.json()) as { columns: string[]; rows: any[][] };
    const records: CaseRecord[] = json.rows.map((r) => {
      const obj: CaseRecord = {};
      json.columns.forEach((c, i) => (obj[c] = r[i]));
      return obj;
    });
    const byCustomerId = new Map<string, CaseRecord[]>();
    const byAccount = new Map<string, CaseRecord[]>();
    const byCaseNo = new Map<string, CaseRecord[]>();
    const push = (m: Map<string, CaseRecord[]>, k: any, rec: CaseRecord) => {
      if (k == null) return;
      const key = String(k).trim();
      if (!key) return;
      const arr = m.get(key) || [];
      arr.push(rec);
      m.set(key, arr);
    };
    records.forEach((rec) => {
      push(byCustomerId, rec["Customer ID"], rec);
      push(byAccount, rec["ACCOUNT_NUMBER"], rec);
      push(byCaseNo, rec["CaseNo."], rec);
    });
    cache = { columns: json.columns, rows: json.rows, records, byCustomerId, byAccount, byCaseNo };
    return cache;
  })();
  return loading;
}

export function useCases() {
  const [data, setData] = useState<CasesData | null>(cache);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (cache) return;
    loadCases().then(setData).catch((e) => setError(e.message));
  }, []);
  return { data, error, loading: !data && !error };
}

export function searchCases(
  data: CasesData,
  type: "customerId" | "account" | "caseNo",
  term: string,
): CaseRecord[] {
  const q = term.trim();
  if (!q) return [];
  if (type === "customerId") {
    // primary: lookup by Customer ID — returns ALL cases for that ID
    const exact = data.byCustomerId.get(q);
    if (exact) return exact;
  } else if (type === "account") {
    const exact = data.byAccount.get(q);
    if (exact) {
      // also fetch all cases for the same Customer ID(s)
      const ids = new Set(exact.map((r) => String(r["Customer ID"] ?? "")).filter(Boolean));
      const all: CaseRecord[] = [];
      ids.forEach((id) => {
        const arr = data.byCustomerId.get(id);
        if (arr) all.push(...arr);
      });
      return all.length ? all : exact;
    }
  } else if (type === "caseNo") {
    const exact = data.byCaseNo.get(q);
    if (exact) {
      const ids = new Set(exact.map((r) => String(r["Customer ID"] ?? "")).filter(Boolean));
      const all: CaseRecord[] = [];
      ids.forEach((id) => {
        const arr = data.byCustomerId.get(id);
        if (arr) all.push(...arr);
      });
      return all.length ? all : exact;
    }
  }
  return [];
}
