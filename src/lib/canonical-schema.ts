// Canonical wallet schema — ALIGNED 1:1 with the official portfolio Excel file.
// Keys MUST match the file's column names exactly. Aliases are additive only.
// Rule: cards / filters / counters bind to these exact field names — no guessing.

export type FieldType = "text" | "number" | "boolean" | "date" | "phone" | "id" | "account" | "product";

export type FieldDef = {
  key: string;          // canonical Arabic name — MUST equal the official Excel header
  type: FieldType;
  aliases: string[];    // synonyms (Arabic + English + common typos / trailing spaces)
  forbid?: string[];    // substrings in a header name that DISQUALIFY it for this field
};

// Official 29 canonical fields, in the exact order of the portfolio file.
export const CANONICAL_FIELDS: FieldDef[] = [
  { key: "رقم الحساب", type: "account",
    aliases: ["رقم الحساب", "account", "account number", "acc no", "ACCOUNT_NUMBER", "رقم العقد", "contract", "contract number"] },
  { key: "الاكشن", type: "text",
    aliases: ["الاكشن", "الإجراء", "Action", "Status", "حاله المتابعه", "حالة المتابعة", "متابعه", "متابعة"] },
  { key: "تيم جدة / تيم الرياض", type: "text",
    aliases: ["تيم جدة / تيم الرياض", "تيم", "team", "team city", "المنطقة", "الفرع"] },
  { key: "الرقم الوظيفي للمحصل", type: "text",
    aliases: ["الرقم الوظيفي للمحصل", "ID AGENT", "ID_AGENT", "Agent ID", "Collector ID", "Employee ID", "Agent Employee ID", "الرقم الوظيفي", "رقم المحصل", "كود المحصل", "رقم الموظف"] },
  { key: "اسم المحصل", type: "text",
    aliases: ["اسم المحصل", "Agent", "Collector", "Agent Name", "Collector Name", "المحصل"] },
  { key: "الرقم الوظيفي للمشرف", type: "text",
    aliases: ["الرقم الوظيفي للمشرف", "Supervisor ID", "supervisor employee id", "رقم المشرف", "كود المشرف"] },
  { key: "اسم المشرف", type: "text",
    aliases: ["اسم المشرف", "Supervisor", "Supervisors", "المشرف", "السوبر فايزر", "سوبرفايزر"] },
  { key: "مبلغ المديونية", type: "number",
    aliases: ["مبلغ المديونية", "مبلغ المديونيه", "LOAN_BALANCE", "Loan Balance", "Outstanding", "Total Due", "Amount", "Balance", "المبلغ", "المبلغ المستحق", "رصيد التمويل", "رصيد القرض", "اجمالي المديونيه", "اجمالي المديونية", "رصيد"] },
  { key: "عدد ايام التعثر", type: "number",
    aliases: ["عدد ايام التعثر", "عدد أيام التعثر", "عمر الدين", "DPD", "DPD_COUNTER", "Debt Age", "أيام التأخر", "ايام التاخر", "عدد أيام التأخر", "عدد ايام التاخر"] },
  { key: "نوع المنتج", type: "product",
    aliases: ["نوع المنتج", "PRODUCT_CATEGORY", "Product", "Product Type", "المنتج"] },
  { key: "تاريخ التجميد", type: "date",
    aliases: ["تاريخ التجميد", "jWO_DT", "WO_DT", "Write Off Date", "تاريخ الشطب", "jwodt", "wodt"] },
  { key: "رقم الهوية", type: "id",
    aliases: ["رقم الهوية", "رقم الهويه", "CUST_ID_NO", "National ID", "ID Number", "هوية العميل", "السجل المدني", "رقم السجل المدني", "هوية", "هويه"],
    forbid: ["agent", "employee", "موظف", "محصل", "وظيفي", "مشرف", "supervisor"] },
  { key: "اسم العميل", type: "text",
    aliases: ["اسم العميل", "CUST_NAME_1", "CUST_NAME_2", "Customer Name", "Client Name", "Name", "العميل", "الاسم"],
    forbid: ["agent", "collector", "محصل", "supervisor", "مشرف"] },
  { key: "رقم الجوال", type: "phone",
    aliases: ["رقم الجوال", "الجوال", "CUST_PHONE_MOBILE_1", "CUST_PHONE_MOBILE_2", "Mobile", "Phone", "Tel", "رقم العميل", "هاتف العميل", "موبايل", "تلفون"],
    forbid: ["agent", "موظف", "محصل", "مشرف"] },
  { key: "عميل متوفي", type: "boolean",
    aliases: ["عميل متوفي", "متوفي", "متوفى", "Death", "Deceased", "Deceased Customer", "وفاه", "وفاة"] },
  { key: "عميل رواتب", type: "boolean",
    aliases: ["عميل رواتب", "Salary", "Salary Customer", "Payroll", "راتب", "رواتب"] },
  { key: "CaseNo. رقم القضية", type: "text",
    aliases: ["CaseNo. رقم القضية", "CaseNo", "Case Number", "Case No", "رقم القضية", "رقم القضيه", "رقم الدعوى", "القضية", "القضيه"] },
  { key: "اسم المحكمة", type: "text",
    aliases: ["اسم المحكمة", "Court", "Court Name", "المحكمة", "المحكمه"] },
  { key: "طلب اعفاء", type: "text",
    aliases: ["طلب اعفاء", "طلب إعفاء", "اعفاء", "إعفاء", "Exemption", "Exemption Request"] },
  { key: "مرجع الحجز التنفيذي", type: "text",
    aliases: ["مرجع الحجز التنفيذي", "رقم المرجع التنفيذي", "Execution Reference", "Execution Ref", "رقم التنفيذ", "مرجع التنفيذ"] },
  { key: "ارصدة محجوزه", type: "text",
    aliases: ["ارصدة محجوزه", "ارصده محجوزه", "أرصدة محجوزة", "أرصده محجوزه", "Blocked Balance", "Held Balance", "Frozen Balance", "رصيد محجوز", "أرصده محجوزه بالحساب الجاري"] },
  { key: "طلب جدولة", type: "text",
    aliases: ["طلب جدولة", "طلب جدوله", "جدولة", "Reschedule", "Reschedule Request"] },
  { key: "رقم الطلب", type: "text",
    aliases: ["رقم الطلب", "Request No", "Request Number", "Application No"] },
  { key: "تصنيف الطلب", type: "text",
    aliases: ["تصنيف الطلب", "Request Type", "Request Classification", "نوع الطلب"] },
  { key: "حالة الطلب الفرعية", type: "text",
    aliases: ["حالة الطلب الفرعية", "حاله الطلب الفرعيه", "Sub Status", "Request Sub Status"] },
  { key: "عدد الطلبات على رقم هوية العميل", type: "number",
    aliases: ["عدد الطلبات على رقم هوية العميل", "عدد الطلبات", "Requests Count"] },
  { key: "تاريخ فتح الطلب", type: "date",
    aliases: ["تاريخ فتح الطلب", "Request Open Date", "Open Date"] },
  { key: "الوصف", type: "text",
    aliases: ["الوصف", "Description", "ملاحظات", "Notes"] },
  { key: "التثبيت", type: "text",
    aliases: ["التثبيت", "تثبيت", "Installment", "Hold", "Hold Status", "Fix", "Fixation", "keep", "rotation"] },
];

export const CANONICAL_KEYS = CANONICAL_FIELDS.map((f) => f.key);

export type CanonicalRow = Record<string, string | number | boolean | null>;
