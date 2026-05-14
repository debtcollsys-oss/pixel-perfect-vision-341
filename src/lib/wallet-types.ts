export type Customer = {
  "رقم الحساب"?: string | null;
  "المبلغ"?: number | null;
  "الاكشن"?: string | null;
  "التثبيت"?: string | null;
  "المنتج"?: string | null;
  "عمر الدين"?: string | null;
  "رقم الهوية"?: string | null;
  "اسم العميل"?: string | null;
  "رقم الجوال"?: string | null;
  "عميل رواتب"?: string | null;
  "عميل متوفي"?: string | null;
  "رقم القضية"?: string | null;
  "رقم الطلب في نظام سيبل"?: string | null;
  "طلب الطلب"?: string | null;
  "ارصده محجوزه"?: number | null;
};

export type ContactLog = {
  date: string; // ISO
  channel: "call" | "whatsapp" | "sms" | "other";
  note?: string;
};

export type CustomerState = {
  contacted: boolean;
  lastContactedAt?: string;
  notes?: string;
  noteLog?: { date: string; text: string }[];
  logs?: ContactLog[];
  edits?: Partial<Customer>;
  hasExemption?: boolean;
  hasReschedule?: boolean;
  defaultDate?: string; // تاريخ التعثر (ISO yyyy-mm-dd)
  clientStatus?: "salary" | "death" | "none"; // حالة العميل
};

export const customerKey = (c: Customer) =>
  c["رقم الحساب"] || c["رقم الهوية"] || c["اسم العميل"] || "";

export function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  let s = String(p).replace(/\D/g, "");
  if (!s) return null;
  // Saudi: convert 05xxxxxxxx → 9665xxxxxxxx
  if (s.startsWith("05") && s.length === 10) s = "966" + s.slice(1);
  if (s.startsWith("5") && s.length === 9) s = "966" + s;
  if (s.startsWith("009665")) s = s.slice(2);
  return s;
}

export function formatPhone(p?: string | null): string {
  const n = normalizePhone(p);
  if (!n) return "—";
  if (n.startsWith("966") && n.length === 12) {
    return `+966 ${n.slice(3, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
  }
  return "+" + n;
}

export function formatCurrency(n?: number | null): string {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(n));
}
