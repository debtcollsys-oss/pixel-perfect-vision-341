export type Customer = {
  // ---- Official portfolio columns (new order) ----
  "رقم الحساب"?: string | null;
  "مبلغ المديونية"?: number | null;
  "Note"?: string | null;
  "الاكشن"?: string | null;
  "الرقم الوظيفي للمحصل"?: string | null;
  "اسم المحصل"?: string | null;
  "الرقم الوظيفي للمشرف"?: string | null;
  "اسم المشرف"?: string | null;
  "عدد ايام التعثر"?: string | number | null;
  "نوع المنتج"?: string | null;
  "تاريخ التجميد"?: string | null;
  "رقم الهوية"?: string | null;
  "اسم العميل"?: string | null;
  "رقم الجوال"?: string | null;
  "عميل متوفي"?: string | null;
  "عميل رواتب"?: string | null;
  "تقييم الأعمال"?: string | null;
  "jWO-DT"?: string | null;
  "رقم القضية"?: string | null;
  "اسم المحكمة"?: string | null;
  "رقم طلب سيبل"?: string | null;
  "نوع الطلب"?: string | null;
  "الوصف"?: string | null;
  "مرجع الحجز التنفيذي"?: string | null;
  "ارصدة محجوزه"?: string | number | null;
  "عميل مشترك"?: string | null;
  "طلب جدولة"?: string | null;
  "التثبيت"?: string | null;
  // ---- Legacy aliases (mirrored for backward compat with older UI code) ----
  "المبلغ"?: number | null;
  "المنتج"?: string | null;
  "عمر الدين"?: string | number | null;
  "ارصده محجوزه"?: number | null;
  "رقم الطلب في نظام سيبل"?: string | null;
  "طلب الطلب"?: string | null;
  // ---- Deprecated legacy fields (kept optional so older references compile) ----
  "CaseNo. رقم القضية"?: string | null;
  "طلب اعفاء"?: string | null;
  "رقم الطلب"?: string | null;
  "تصنيف الطلب"?: string | null;
  "حالة الطلب الفرعية"?: string | null;
  "عدد الطلبات على رقم هوية العميل"?: number | null;
  "تاريخ فتح الطلب"?: string | null;
  "الوصف"?: string | null;
  "تيم جدة / تيم الرياض"?: string | null;
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
