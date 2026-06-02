import type { CanonicalRow } from "./canonical-schema";
import type { Customer } from "./wallet-types";

// Bridges canonical rows (matching the official portfolio Excel columns) into the
// Customer shape used by the UI. Populates BOTH the official field names and
// the legacy aliases the older UI still reads from, so cards/filters stay in sync.
export function canonicalToCustomer(row: CanonicalRow): Customer & { "ID AGENT"?: string | null } {
  const get = (k: string) => row[k] ?? null;
  const num = (v: any) => (typeof v === "number" ? v : v == null ? null : Number(v));
  const yesNo = (v: any): string | null => (v === true ? "نعم" : v === false ? "لا" : v == null ? null : String(v));
  const str = (v: any): string | null => (v == null || v === "" ? null : String(v));
  const amount = num(get("مبلغ المديونية"));
  const product = get("نوع المنتج");
  const debtAge = get("عدد ايام التعثر");
  const caseNo = get("CaseNo. رقم القضية");
  const held = get("ارصدة محجوزه");
  const requestNo = get("رقم الطلب");
  return {
    // ---- Official columns (exact names from the portfolio file) ----
    "رقم الحساب": get("رقم الحساب") as any,
    "الاكشن": get("الاكشن") as any,
    "تيم جدة / تيم الرياض": str(get("تيم جدة / تيم الرياض")),
    "الرقم الوظيفي للمحصل": str(get("الرقم الوظيفي للمحصل")),
    "اسم المحصل": str(get("اسم المحصل")),
    "الرقم الوظيفي للمشرف": str(get("الرقم الوظيفي للمشرف")),
    "اسم المشرف": str(get("اسم المشرف")),
    "مبلغ المديونية": amount,
    "عدد ايام التعثر": debtAge as any,
    "نوع المنتج": product as any,
    "تاريخ التجميد": str(get("تاريخ التجميد")),
    "رقم الهوية": get("رقم الهوية") as any,
    "اسم العميل": get("اسم العميل") as any,
    "رقم الجوال": get("رقم الجوال") as any,
    "عميل متوفي": yesNo(get("عميل متوفي")),
    "عميل رواتب": yesNo(get("عميل رواتب")),
    "CaseNo. رقم القضية": caseNo as any,
    "اسم المحكمة": get("اسم المحكمة") as any,
    "طلب اعفاء": str(get("طلب اعفاء")),
    "مرجع الحجز التنفيذي": str(get("مرجع الحجز التنفيذي")),
    "ارصدة محجوزه": held as any,
    "طلب جدولة": str(get("طلب جدولة")),
    "رقم الطلب": str(requestNo),
    "تصنيف الطلب": str(get("تصنيف الطلب")),
    "حالة الطلب الفرعية": str(get("حالة الطلب الفرعية")),
    "عدد الطلبات على رقم هوية العميل": num(get("عدد الطلبات على رقم هوية العميل")),
    "تاريخ فتح الطلب": str(get("تاريخ فتح الطلب")),
    "الوصف": str(get("الوصف")),
    "التثبيت": str(get("التثبيت")),
    // ---- Legacy aliases (kept so existing UI code keeps reading them) ----
    "المبلغ": amount,
    "المنتج": product as any,
    "عمر الدين": debtAge as any,
    "رقم القضية": caseNo as any,
    "ارصده محجوزه": typeof held === "number" ? held : num(held),
    "رقم الطلب في نظام سيبل": str(requestNo),
    // ---- Agent assignment hook for wallet-store ----
    "ID AGENT": get("الرقم الوظيفي للمحصل") as any,
  };
}
