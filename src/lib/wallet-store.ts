import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, CustomerState, ContactLog } from "./wallet-types";
import { customerKey } from "./wallet-types";
import { getSession } from "@/components/LoginGate";
import defaultData from "@/data/wallet.json";
import { getWalletCustomers } from "./wallet.functions";
import { clearWalletCustomers, appendWalletCustomers } from "./wallet-write.functions";

type Meta = { fileName?: string; uploadedAt?: string; count: number };

const ARABIC_FIELDS: (keyof Customer)[] = [
  // ---- Official portfolio columns ----
  "رقم الحساب",
  "الاكشن",
  "تيم جدة / تيم الرياض",
  "الرقم الوظيفي للمحصل",
  "اسم المحصل",
  "الرقم الوظيفي للمشرف",
  "اسم المشرف",
  "مبلغ المديونية",
  "عدد ايام التعثر",
  "نوع المنتج",
  "تاريخ التجميد",
  "رقم الهوية",
  "اسم العميل",
  "رقم الجوال",
  "عميل متوفي",
  "عميل رواتب",
  "CaseNo. رقم القضية",
  "اسم المحكمة",
  "طلب اعفاء",
  "مرجع الحجز التنفيذي",
  "ارصدة محجوزه",
  "طلب جدولة",
  "رقم الطلب",
  "تصنيف الطلب",
  "حالة الطلب الفرعية",
  "عدد الطلبات على رقم هوية العميل",
  "تاريخ فتح الطلب",
  "الوصف",
  "التثبيت",
  // ---- Legacy mirrors ----
  "المبلغ",
  "المنتج",
  "عمر الدين",
  "رقم القضية",
  "ارصده محجوزه",
  "رقم الطلب في نظام سيبل",
];

function rowToCustomer(row: any): Customer {
  // If row has 'raw' jsonb (cloud row), prefer it; else assume Arabic-keyed row
  const src = row.raw && typeof row.raw === "object" ? row.raw : row;
  const out: any = {};
  for (const f of ARABIC_FIELDS) out[f] = src[f] ?? null;
  return out as Customer;
}

function customerToDbRow(c: Customer, importedBy: string | null) {
  const isYes = (v: any) => {
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    if (!s) return false;
    return !["no", "0", "false", "لا", "غير", "-", ""].includes(s);
  };
  const key = customerKey(c);
  const amt = c["مبلغ المديونية"] ?? c["المبلغ"];
  return {
    customer_key: String(key),
    account_number: c["رقم الحساب"] ? String(c["رقم الحساب"]) : null,
    national_id: c["رقم الهوية"] ? String(c["رقم الهوية"]) : null,
    customer_name: c["اسم العميل"] ?? null,
    phone: c["رقم الجوال"] ? String(c["رقم الجوال"]) : null,
    amount: amt != null && !isNaN(Number(amt)) ? Number(amt) : null,
    product: (c["نوع المنتج"] ?? c["المنتج"]) ?? null,
    debt_age: (c["عدد ايام التعثر"] ?? c["عمر الدين"]) as any ?? null,
    action: c["الاكشن"] ?? null,
    installment: c["التثبيت"] ?? null,
    is_salary: isYes(c["عميل رواتب"]),
    is_deceased: isYes(c["عميل متوفي"]),
    agent_employee_id:
      (c as any)["ID AGENT"] ??
      c["الرقم الوظيفي للمحصل"] ??
      (c as any)["agent_employee_id"] ??
      null,
    raw: c,
    imported_by: importedBy,
  };
}

export function useWallet() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<Meta>({ count: 0, fileName: "محفظة سحابية" });
  const [hydrated, setHydrated] = useState(false);
  const loadWalletCustomers = useServerFn(getWalletCustomers);
  const replaceCustomersFn = useServerFn(replaceWalletCustomers);

  const load = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setCustomers([]);
      setMeta({ count: 0, fileName: "لا توجد جلسة" });
      setHydrated(true);
      return;
    }
    try {
      const data = await loadWalletCustomers({
        data: { role: session.role, employeeId: session.employeeId },
      });
      const list = (data || []).map(rowToCustomer);
      setCustomers(list);
      const latest = (data || []).reduce(
        (acc: string | undefined, r: any) =>
          acc && new Date(acc) > new Date(r.imported_at) ? acc : r.imported_at,
        undefined,
      );
      setMeta({
        count: list.length,
        fileName: list.length ? "محفظة سحابية" : "لا توجد بيانات",
        uploadedAt: latest,
      });
    } catch (error) {
      console.error("load customers", error);
      setCustomers([]);
      setMeta({ count: 0, fileName: "خطأ في التحميل" });
    }
    setHydrated(true);
  }, [loadWalletCustomers]);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceData = useCallback(
    async (next: Customer[], fileName?: string) => {
      const session = getSession();
      if (!session || session.role !== "admin") {
        throw new Error("الإدارة فقط يمكنها استبدال المحفظة");
      }
      const rows = next.map((c) => ({
        ...customerToDbRow(c, null),
        file_month: fileName || null,
      }));
      const dedup = new Map<string, any>();
      for (const r of rows) {
        if (r.customer_key) dedup.set(r.customer_key, r);
      }
      const finalRows = Array.from(dedup.values()).map((r) => ({
        ...r,
        agent_employee_id: r.agent_employee_id != null ? String(r.agent_employee_id) : null,
        account_number: r.account_number != null ? String(r.account_number) : null,
        national_id: r.national_id != null ? String(r.national_id) : null,
        phone: r.phone != null ? String(r.phone) : null,
        debt_age: r.debt_age != null ? String(r.debt_age) : null,
      }));
      await replaceCustomersFn({
        data: { employeeId: session.employeeId, rows: finalRows },
      });
      await load();
    },
    [load, replaceCustomersFn],
  );

  const resetData = useCallback(async () => {
    await replaceData(defaultData as Customer[], "محفظة افتراضية");
  }, [replaceData]);

  return { customers, meta, hydrated, replaceData, resetData, reload: load };
}

export function useCustomerStates() {
  const [states, setStates] = useState<Record<string, CustomerState>>({});
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void (async () => {
      const { data, error } = await supabase
        .from("customer_states")
        .select("*")
        .limit(50000);
      if (error) {
        console.error("load states", error);
        return;
      }
      const map: Record<string, CustomerState> = {};
      for (const r of data || []) {
        map[r.customer_key] = {
          contacted: !!r.contacted,
          lastContactedAt: r.last_contacted_at ?? undefined,
          notes: r.notes ?? undefined,
          hasExemption: !!r.has_exemption,
          hasReschedule: !!r.has_reschedule,
          defaultDate: r.default_date ?? undefined,
          clientStatus: (r.client_status as any) ?? undefined,
          edits: (r.edits as any) ?? undefined,
        };
      }
      // Load logs grouped by customer_key
      const { data: logs } = await supabase
        .from("contact_logs")
        .select("customer_key, channel, note, created_at")
        .order("created_at", { ascending: true })
        .limit(50000);
      for (const l of logs || []) {
        const cur = map[l.customer_key] || { contacted: false };
        cur.logs = [
          ...(cur.logs || []),
          { date: l.created_at, channel: l.channel as any, note: l.note ?? undefined },
        ];
        map[l.customer_key] = cur;
      }
      // Load notes
      const { data: noteRows } = await supabase
        .from("customer_notes")
        .select("customer_key, text, created_at")
        .order("created_at", { ascending: true })
        .limit(50000);
      for (const n of noteRows || []) {
        const cur = map[n.customer_key] || { contacted: false };
        cur.noteLog = [
          ...(cur.noteLog || []),
          { date: n.created_at, text: n.text },
        ];
        map[n.customer_key] = cur;
      }
      setStates(map);
    })();
  }, []);

  const update = useCallback((key: string, patch: Partial<CustomerState>) => {
    setStates((prev) => {
      const cur = prev[key] || { contacted: false };
      const merged = { ...cur, ...patch };
      void supabase
        .from("customer_states")
        .upsert(
          {
            customer_key: key,
            contacted: merged.contacted ?? false,
            last_contacted_at: merged.lastContactedAt ?? null,
            notes: merged.notes ?? null,
            has_exemption: merged.hasExemption ?? false,
            has_reschedule: merged.hasReschedule ?? false,
            default_date: merged.defaultDate ?? null,
            client_status: merged.clientStatus ?? null,
            edits: merged.edits ?? null,
            updated_by: null,
          },
          { onConflict: "customer_key" },
        )
        .then(({ error }) => {
          if (error) console.error("upsert state", error);
        });
      // Persist note log additions
      if (patch.noteLog && patch.noteLog.length > (cur.noteLog?.length || 0)) {
        const newOnes = patch.noteLog.slice(cur.noteLog?.length || 0);
        void (async () => {
          for (const n of newOnes) {
            await supabase.from("customer_notes").insert({
              customer_key: key,
              text: n.text,
              created_by: null,
            });
          }
        })();
      }
      return { ...prev, [key]: merged };
    });
  }, []);

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
      void (async () => {
        await supabase.from("contact_logs").insert({
          customer_key: key,
          channel: log.channel,
          note: log.note ?? null,
          created_by: null,
        });
        await supabase
          .from("customer_states")
          .upsert(
            {
              customer_key: key,
              contacted: true,
              last_contacted_at: log.date,
            },
            { onConflict: "customer_key" },
          );
      })();
      return next;
    });
  }, []);

  return { states, update, addLog };
}
