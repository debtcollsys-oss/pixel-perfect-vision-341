import type React from "react";
import { useMemo, useState, useRef, useEffect } from "react";
import { Phone, MessageCircle, Search, Upload, RotateCcw, Users, Wallet, AlertTriangle, BadgeCheck, X, Filter, Copy, Check, FileSpreadsheet, Calculator, Menu, Scale, Eye, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useWallet, useCustomerStates } from "@/lib/wallet-store";
import { loadPolicies, loadActiveId, computeDebtAge, ageBucketFor, getDiscountRate, type ProductType, type CaseStatus } from "@/lib/discount-policy";
import { ThirdPartyDialog } from "@/components/ThirdPartyDialog";
import { CollectorSlider } from "@/components/CollectorSlider";
import { QuickActionsHub } from "@/components/QuickActionsHub";
import CollectorInfoCard from "@/components/CollectorInfoCard";
import { Send } from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.11 4.91A10 10 0 0 0 2.05 14.93L1 21l6.22-1.02a10 10 0 0 0 4.78 1.21h.01A10 10 0 0 0 19.11 4.91Zm-7.1 14.36h-.01a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.69.6.62-3.6-.2-.31a8.3 8.3 0 1 1 7.81 4.65Zm4.55-6.22c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.56.13-.17.25-.65.81-.79.97-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.39-1.72c-.14-.25-.01-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.13.17 1.74 2.66 4.22 3.73.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.29Z"/>
    </svg>
  );
}
import {
  type Customer,
  customerKey,
  formatCurrency,
  formatPhone,
  normalizePhone,
} from "@/lib/wallet-types";

const firstName = (full?: string | null) => {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/)[0];
};
const WA_TEMPLATE = (clientFirst: string, agentFirst: string) =>
  `السلام عليكم ورحمة الله\n\nالأخ / ${clientFirst}\n\nمساء الخير 🤍\n\nمعك أخوك ${agentFirst}\n\nمن إدارة البنك الأهلي السعودي بجدة\n\nالإدارة العامة \n\nأعتذر عن الإزعاج ، تواصلي معك بخصوص مبلغ المديونية القائم عليك \n\nإذا حاب تستفيد من الخصم المقدم لك من البنك الأهلي بموجب خطاب تسوية ، أو مناقشة بدائل أخرى لمعالجة التعثر، ومن ضمنها :\n\n✔︎ إعادة الجدولة \n\n✔︎ شراء المديونية،\n\n✔︎ تقديم طلب إعفاء من المديونية ، في حال وجود تقرير طبي يوضح العجز وعدم اللياقة الطبية للعمل.\n\nويهدف هذا التواصل إلى دراسة إمكانية معالجة التعثر والوقوف على رغبتكم ، والإستماع إلى مقترحاتكم ، والعمل معكم للوصول إلى حل مناسب لكم أولًا ، وبما ترونه أنتم ملائماً حسب وضعكم المالي وبما يتوافق مع الأنظمة المعمول بها \n\nوشكراً 🤍`;

export default function WalletApp() {
  const { customers, meta, hydrated, replaceData, resetData } = useWallet();
  const { states, update, addLog } = useCustomerStates();

  const [q, setQ] = useState("");
  const [searchBy, setSearchBy] = useState<"name" | "id" | "phone" | "account">("name");
  const [filterType, setFilterType] = useState<"product" | "salary" | "death" | "request">("product");
  const [filterValue, setFilterValue] = useState<string>("all");
  const [openCustomer, setOpenCustomer] = useState<Customer | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const products = useMemo(
    () =>
      Array.from(
        new Set(customers.map((c) => c["نوع المنتج"] ?? c["المنتج"]).filter(Boolean)),
      ) as string[],
    [customers],
  );
  const isYes = (v: any) => {
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    if (!s) return false;
    return !["no", "0", "false", "لا", "غير", "-"].includes(s);
  };
  const nonEmpty = (v: any) => v != null && String(v).trim() !== "";
  const hasRequest = (c: Customer) =>
    nonEmpty(c["طلب اعفاء"]) ||
    nonEmpty(c["طلب جدولة"]) ||
    nonEmpty(c["رقم الطلب"]) ||
    nonEmpty(c["تصنيف الطلب"]) ||
    nonEmpty(c["حالة الطلب الفرعية"]) ||
    nonEmpty(c["رقم الطلب في نظام سيبل"]);

  const filtered = useMemo(() => {
    const term = q.trim();
    return customers
      .filter((c) => {
        if (filterValue !== "all") {
          if (filterType === "product") {
            const p = String(c["نوع المنتج"] ?? c["المنتج"] ?? "").toUpperCase();
            if (!p.includes(filterValue)) return false;
          } else if (filterType === "salary") {
            const yes = isYes(c["عميل رواتب"]);
            if (filterValue === "yes" && !yes) return false;
            if (filterValue === "no" && yes) return false;
          } else if (filterType === "death") {
            const yes = isYes(c["عميل متوفي"]);
            if (filterValue === "yes" && !yes) return false;
            if (filterValue === "no" && yes) return false;
          } else if (filterType === "request") {
            const yes = hasRequest(c);
            if (filterValue === "yes" && !yes) return false;
            if (filterValue === "no" && yes) return false;
          }
        }
        if (term) {
          const fieldMap = {
            name: c["اسم العميل"],
            id: c["رقم الهوية"],
            phone: c["رقم الجوال"],
            account: c["رقم الحساب"],
          } as const;
          const val = String(fieldMap[searchBy] ?? "");
          if (!val.includes(term)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          (Number(b["مبلغ المديونية"] ?? b["المبلغ"]) || 0) -
          (Number(a["مبلغ المديونية"] ?? a["المبلغ"]) || 0),
      );
  }, [customers, q, searchBy, filterType, filterValue]);

  const stats = useMemo(() => {
    const total = customers.reduce(
      (s, c) => s + (Number(c["مبلغ المديونية"] ?? c["المبلغ"]) || 0),
      0,
    );
    const death = customers.filter((c) => isYes(c["عميل متوفي"])).length;
    const salary = customers.filter((c) => isYes(c["عميل رواتب"])).length;
    const promise = customers.filter((c) => {
      const k = customerKey(c);
      const act = (states[k]?.edits?.["الاكشن"] ?? c["الاكشن"]) as string | undefined;
      return act === "وعد سداد";
    }).length;
    return { total, death, salary, promise, count: customers.length };
  }, [customers, states]);

  const totalCollected = useMemo(
    () =>
      Object.values(states).reduce((s, st: any) => {
        const v = Number(st?.paymentAmount);
        return s + (Number.isFinite(v) ? v : 0);
      }, 0),
    [states],
  );

  const handleUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Customer>(sheet, { defval: null });
      // normalize numeric-like ID fields to strings
      const cleaned = rows.map((r: any) => {
        const out: any = { ...r };
        ["رقم الحساب", "رقم الهوية", "رقم القضية", "رقم الجوال", "رقم الطلب في نظام سيبل"].forEach((k) => {
          if (out[k] != null) {
            const num = Number(out[k]);
            out[k] = Number.isFinite(num) && !isNaN(num) ? String(Math.trunc(num)) : String(out[k]);
          }
        });
        return out as Customer;
      });
      replaceData(cleaned, file.name);
      toast.success(`تم رفع ${cleaned.length} عميل من ${file.name}`);
    } catch (e: any) {
      toast.error("تعذر قراءة الملف: " + (e?.message || ""));
    }
  };

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="القائمة"
          >
            <Menu className="size-5" />
          </Button>
          <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Wallet className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">إدارة المحفظة</h1>
            <p className="text-xs text-muted-foreground truncate">
              {meta.fileName} · {meta.count} عميل
              {meta.uploadedAt ? ` · رُفع ${new Date(meta.uploadedAt).toLocaleDateString("en-US")}` : ""}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {/* Side Menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[280px] sm:w-[320px]">
          <SheetHeader>
            <SheetTitle className="text-right">القائمة</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => setMenuOpen(false)}
            >
              <Link to="/calculator">
                <Calculator className="size-5" />
                <span>حاسبة الخصم</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => setMenuOpen(false)}
            >
              <Link to="/cases">
                <Scale className="size-5" />
                <span>ملف القضايا</span>
              </Link>
            </Button>
            {/* رفع الملفات حصراً من لوحة الإدارة — تم إخفاؤها للمحصل */}
          </div>
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-7xl px-4 py-5 space-y-5">
        {/* بطاقة بيانات المحصل */}
        <CollectorInfoCard />

        {/* Collector slider */}
        <section className="max-w-sm mx-auto space-y-4">
          <CollectorSlider collected={totalCollected} accountsCount={stats.count} walletTotal={stats.total} />
          <QuickActionsHub />
        </section>


        {/* Search */}
        <Card className="p-3 md:p-4">
          <div className="flex gap-2">
            <Select value={searchBy} onValueChange={(v) => setSearchBy(v as typeof searchBy)}>
              <SelectTrigger className="w-[140px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">رقم الهوية</SelectItem>
                <SelectItem value="account">رقم الحساب</SelectItem>
                <SelectItem value="phone">رقم الجوال</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث…"
                className="pr-9"
                inputMode={searchBy === "name" ? "text" : "numeric"}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-3 md:p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground shrink-0" />
            <Select
              value={filterType}
              onValueChange={(v) => {
                setFilterType(v as typeof filterType);
                setFilterValue("all");
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">نوع المنتج</SelectItem>
                <SelectItem value="salary">عميل رواتب</SelectItem>
                <SelectItem value="death">عميل متوفي</SelectItem>
                <SelectItem value="request">عميل لديه طلب في سيبل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {filterType === "product" ? (
                  <>
                    <SelectItem value="PF">PF</SelectItem>
                    <SelectItem value="AL">AL</SelectItem>
                    <SelectItem value="CC">CC</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground text-left">
            {filtered.length.toLocaleString("en-US")} نتيجة
          </div>
        </Card>

        {/* List */}
        <section className="space-y-2">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              لا توجد نتائج مطابقة
            </Card>
          )}
          {filtered.map((c) => {
            const k = customerKey(c);
            const st = states[k];
            const hasExemption = nonEmpty(c["طلب اعفاء"]);
            const hasReschedule = nonEmpty(c["طلب جدولة"]);
            return (
              <CustomerRow
                key={k}
                c={c}
                contacted={!!st?.contacted}
                action={(st?.edits?.["الاكشن"] ?? c["الاكشن"]) as string | null | undefined}
                hasExemption={hasExemption}
                hasReschedule={hasReschedule}
                onOpen={() => setOpenCustomer(c)}
                onCall={() => onCall(c, addLog)}
                onWhats={() => onWhats(c, addLog)}
                onCopy={() => onCopy(c)}
              />
            );
          })}
        </section>
      </main>

      <CustomerSheet
        customer={openCustomer}
        onClose={() => setOpenCustomer(null)}
        state={openCustomer ? states[customerKey(openCustomer)] : undefined}
        onUpdate={(patch) => openCustomer && update(customerKey(openCustomer), patch)}
        onCall={() => openCustomer && onCall(openCustomer, addLog)}
        onWhats={() => openCustomer && onWhats(openCustomer, addLog)}
      />
    </div>
  );
}

function onCall(c: Customer, addLog: (k: string, l: any) => void) {
  const p = normalizePhone(c["رقم الجوال"]);
  if (!p) return toast.error("لا يوجد رقم جوال لهذا العميل");
  addLog(customerKey(c), { date: new Date().toISOString(), channel: "call" });
  window.location.href = `tel:+${p}`;
}
function onWhats(c: Customer, addLog: (k: string, l: any) => void) {
  const p = normalizePhone(c["رقم الجوال"]);
  if (!p) return toast.error("لا يوجد رقم جوال لهذا العميل");
  const text = WA_TEMPLATE(c["اسم العميل"] || "", formatCurrency(c["المبلغ"]));
  addLog(customerKey(c), { date: new Date().toISOString(), channel: "whatsapp" });
  window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`, "_blank");
}
function onCopy(c: Customer) {
  const p = normalizePhone(c["رقم الجوال"]);
  if (!p) return toast.error("لا يوجد رقم");
  navigator.clipboard.writeText("+" + p);
  toast.success("تم نسخ الرقم");
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-2 ${accent ? "bg-primary text-primary-foreground border-primary" : ""}`}>
      <div className="flex items-center gap-1.5">
        <div className={`size-6 rounded-md grid place-items-center shrink-0 ${accent ? "bg-primary-foreground/15" : "bg-accent text-accent-foreground"}`}>
          {icon}
        </div>
        <div className={`text-[10px] truncate ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</div>
      </div>
      <div className="mt-1 text-sm font-bold leading-tight tabular-nums truncate">{value}</div>
    </Card>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[120px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">كل {placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Toggle({ label, v, onV }: { label: string; v: boolean; onV: (b: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2 px-3 h-9 rounded-md border cursor-pointer text-sm ${v ? "bg-accent border-primary/40" : "bg-background"}`}>
      <Switch checked={v} onCheckedChange={onV} />
      <span>{label}</span>
    </label>
  );
}

const ACTION_OPTIONS = [
  { value: "وعد سداد", label: "وعد سداد", dot: "bg-amber-500", trigger: "border-amber-500/60 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30" },
  { value: "بيانات خاطئة", label: "بيانات خاطئة", dot: "bg-rose-500", trigger: "border-rose-500/60 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30" },
  { value: "Call Back", label: "Call Back", dot: "bg-sky-500", trigger: "border-sky-500/60 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30" },
  { value: "رافض السداد", label: "رافض السداد", dot: "bg-red-600", trigger: "border-red-600/60 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30" },
  { value: "تم السداد", label: "تم السداد", dot: "bg-emerald-500", trigger: "border-emerald-500/60 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" },
] as const;

function actionClass(v: string) {
  return ACTION_OPTIONS.find((a) => a.value === v)?.trigger || "";
}

function CustomerRow({ c, contacted, action, hasExemption, hasReschedule, onOpen, onCall, onWhats, onCopy }: {
  c: Customer; contacted: boolean; action?: string | null;
  hasExemption?: boolean; hasReschedule?: boolean;
  onOpen: () => void; onCall: () => void; onWhats: () => void; onCopy: () => void;
}) {
  const phone = normalizePhone(c["رقم الجوال"]);
  const isPromise = action === "وعد سداد";
  return (
    <Card className="relative p-3 hover:shadow-md transition-shadow">
      {isPromise && (
        <span className="absolute -top-2 -right-3 z-10 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide bg-black text-amber-300 shadow-[0_0_14px_2px_rgba(251,191,36,0.55)] ring-1 ring-amber-400/60 -rotate-12 animate-pulse">
          وعد سداد
        </span>
      )}
      <button
        onClick={onOpen}
        aria-label="فتح صفحة العميل"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <ArrowLeft className="size-4" />
        <Eye className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <button onClick={onOpen} className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{c["اسم العميل"] || "بدون اسم"}</span>
            {contacted && <Badge className="bg-success text-success-foreground border-0">تم التواصل</Badge>}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{c["المنتج"] || "—"}</Badge>
            {c["عميل متوفي"] ? (
              <Badge variant="destructive">متوفى</Badge>
            ) : c["عميل رواتب"] ? (
              <Badge variant="secondary">رواتب</Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>هوية: {c["رقم الهوية"] || "—"}</span>
            <span>{formatPhone(c["رقم الجوال"])}</span>
            {c["عمر الدين"] && <span>· {c["عمر الدين"]}</span>}
            {c["التثبيت"] && <span>· {c["التثبيت"]}</span>}
          </div>
        </button>
        <div className="text-left shrink-0">
          <div className="text-sm font-bold text-primary tabular-nums whitespace-nowrap">
            {formatCurrency(c["المبلغ"])} <span className="text-[10px] text-muted-foreground font-normal">ريال</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <Button size="icon" variant="default" onClick={onCall} disabled={!phone} className="size-8" aria-label="اتصال">
          <Phone className="size-4" />
        </Button>
        <Button
          size="icon"
          onClick={onWhats}
          disabled={!phone}
          className="size-8 bg-success text-success-foreground hover:bg-success/90"
          aria-label="واتساب"
        >
          <WhatsAppIcon className="size-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onCopy} disabled={!phone} className="size-8" aria-label="نسخ">
          <Copy className="size-4" />
        </Button>
        {(hasExemption || hasReschedule) && (
          <span
            className={`mr-auto px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse ${
              hasExemption
                ? "text-yellow-950 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 shadow-[0_0_12px_2px_rgba(234,179,8,0.75)]"
                : "text-white bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400 shadow-[0_0_12px_2px_rgba(59,130,246,0.75)]"
            }`}
          >
            طلب سابق - {hasExemption ? "إعفاء" : "جدولة"}
          </span>
        )}
      </div>
    </Card>
  );
}

function CustomerSheet({ customer, onClose, state, onUpdate, onCall, onWhats }: {
  customer: Customer | null;
  onClose: () => void;
  state?: any;
  onUpdate: (patch: any) => void;
  onCall: () => void;
  onWhats: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [thirdPartyOpen, setThirdPartyOpen] = useState(false);

  useEffect(() => {
    setDirty(false);
    setNoteDraft("");
  }, [customer]);

  // حساب التسوية (يجب أن تُستدعى الـHooks قبل أي return مبكر)
  const defaultDate: string = state?.defaultDate || "";
  const productRaw = String(customer?.["المنتج"] || "").toUpperCase();
  const product: ProductType = productRaw.includes("AL") ? "AL" : productRaw.includes("CC") ? "CC" : "PF";
  const caseStatus: CaseStatus =
    (state?.edits?.["رقم القضية"] ?? customer?.["رقم القضية"]) ? "with_case" : "no_case";
  const amount = Number(customer?.["المبلغ"]) || 0;
  const settlement = useMemo(() => {
    if (!defaultDate) return null;
    const today = new Date().toISOString().slice(0, 10);
    const { years } = computeDebtAge(defaultDate, today);
    if (!years) return null;
    const policies = loadPolicies();
    const policy = policies[loadActiveId()];
    if (!policy) return null;
    const bucket = ageBucketFor(years, product, {});
    const rate = getDiscountRate(policy, product, caseStatus, "with_client", bucket);
    const settle = amount * (1 - rate);
    return { years, rate, settle };
  }, [defaultDate, product, caseStatus, amount]);

  if (!customer) return null;
  const c = customer;
  const phone = normalizePhone(c["رقم الجوال"]);

  const markDirtyUpdate = (patch: any) => {
    setDirty(true);
    onUpdate(patch);
  };

  const requestClose = () => {
    if (dirty) setConfirmOpen(true);
    else onClose();
  };

  return (
    <>
    <Sheet open={!!customer} onOpenChange={(o) => !o && requestClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-md overflow-y-auto [&>button.absolute]:left-4 [&>button.absolute]:right-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-right">{c["اسم العميل"]}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Card className="p-4 bg-primary text-primary-foreground">
            <div className="text-xs opacity-80">المبلغ المستحق</div>
            <div className="text-3xl font-bold tabular-nums mt-1">
              {formatCurrency(c["المبلغ"])} <span className="text-base font-normal">SAR</span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onCall} disabled={!phone}>
              <Phone className="size-4 ml-1" /> اتصال
            </Button>
            <Button onClick={onWhats} disabled={!phone} className="bg-success text-success-foreground hover:bg-success/90">
              <MessageCircle className="size-4 ml-1" /> واتساب
            </Button>
          </div>

          <Button
            onClick={() => {
              if (!settlement) {
                toast.error("الرجاء تسجيل تاريخ التجميد ومبلغ التسوية لتتمكن من إحالة العميل إلى طرف ثالث");
                return;
              }
              setThirdPartyOpen(true);
            }}
            variant="outline"
            className="w-full border-primary/40 text-primary hover:bg-primary/5"
          >
            <Send className="size-4 ml-1" /> إرسال العميل إلى طرف ثالث
          </Button>

          {(() => {
            const e = state?.edits || {};
            const get = <K extends keyof Customer>(k: K) => (e[k] ?? c[k]) as any;
            const setEdit = (patch: Partial<Customer>) => {
              setDirty(true);
              onUpdate({ edits: { ...(state?.edits || {}), ...patch } });
            };
            const currentAction = (get("الاكشن") as string) || "";
            const clientStatus: string =
              state?.clientStatus ||
              (c["عميل متوفي"] ? "death" : c["عميل رواتب"] ? "salary" : "none");
            return (
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <Field label="رقم الجوال" value={formatPhone(c["رقم الجوال"])} />
                <Field label="رقم الهوية" value={c["رقم الهوية"]} />
                <Field label="رقم الحساب" value={c["رقم الحساب"]} />
                <Field label="المنتج" value={c["المنتج"]} />
                <Field label="عمر الدين" value={c["عمر الدين"]} />
                <Field label="التثبيت" value={c["التثبيت"]} />

                <EditField label="الحالة" className="col-span-2">
                  <Select
                    value={clientStatus}
                    onValueChange={(v) => markDirtyUpdate({ clientStatus: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="salary">عميل رواتب</SelectItem>
                      <SelectItem value="death">عميل متوفي</SelectItem>
                    </SelectContent>
                  </Select>
                </EditField>

                <EditField label="الاكشن" className="col-span-2">
                  <Select
                    value={currentAction}
                    onValueChange={(v) => setEdit({ "الاكشن": v })}
                  >
                    <SelectTrigger className={`h-8 text-xs ${currentAction ? actionClass(currentAction) : ""}`}>
                      <SelectValue placeholder="اختر الاكشن" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          <span className={`inline-flex items-center gap-2`}>
                            <span className={`size-2 rounded-full ${a.dot}`} />
                            {a.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </EditField>

                <EditField label="رقم القضية">
                  <Input
                    value={(get("رقم القضية") as string) || ""}
                    onChange={(ev) => setEdit({ "رقم القضية": ev.target.value })}
                    className="h-8 text-xs"
                  />
                </EditField>
                <EditField label="رقم الطلب في نظام سيبل">
                  <Input
                    value={(get("رقم الطلب في نظام سيبل") as string) || ""}
                    onChange={(ev) => setEdit({ "رقم الطلب في نظام سيبل": ev.target.value })}
                    className="h-8 text-xs"
                  />
                </EditField>
                <EditField label="نوع الطلب" className="col-span-2">
                  <Select
                    value={(() => {
                      const v = (get("طلب الطلب") as string) || "";
                      if (/جدول/.test(v)) return "طلب جدولة";
                      if (/إعفاء|اعفاء/.test(v)) return "طلب إعفاء";
                      return "";
                    })()}
                    onValueChange={(v) => setEdit({ "طلب الطلب": v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="اختر نوع الطلب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="طلب إعفاء">طلب إعفاء</SelectItem>
                      <SelectItem value="طلب جدولة">طلب جدولة</SelectItem>
                    </SelectContent>
                  </Select>
                </EditField>
                <EditField label="أرصدة محجوزة" className="col-span-2">
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={(get("ارصده محجوزه") as number | string) ?? ""}
                      onChange={(ev) =>
                        setEdit({ "ارصده محجوزه": ev.target.value === "" ? null : Number(ev.target.value) })
                      }
                      className="h-8 text-xs tabular-nums pl-12"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                      SAR
                    </span>
                  </div>
                </EditField>

                <EditField label="مبلغ السداد" className="col-span-2">
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={(state?.paymentAmount as number | string) ?? ""}
                      onChange={(ev) =>
                        markDirtyUpdate({
                          paymentAmount: ev.target.value === "" ? null : Number(ev.target.value),
                          ...(ev.target.value === "" ? { paymentType: null } : {}),
                        })
                      }
                      className="h-8 text-xs tabular-nums pl-12"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                      SAR
                    </span>
                  </div>
                </EditField>
                {state?.paymentAmount != null && state?.paymentAmount !== "" && (
                  <EditField label="نوع السداد" className="col-span-2">
                    <Select
                      value={(state?.paymentType as string) || ""}
                      onValueChange={(v) => markDirtyUpdate({ paymentType: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="اختر نوع السداد" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="جدولة">جدولة</SelectItem>
                        <SelectItem value="شيك">شيك</SelectItem>
                        <SelectItem value="إعفاء">إعفاء</SelectItem>
                        <SelectItem value="تسوية">تسوية</SelectItem>
                      </SelectContent>
                    </Select>
                  </EditField>
                )}

                <EditField label="تاريخ التجميد" className="col-span-2">
                  <Input
                    type="date"
                    value={defaultDate}
                    onChange={(ev) => markDirtyUpdate({ defaultDate: ev.target.value })}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                    أدخل تاريخ التجميد للحصول على مبلغ التسوية
                  </p>
                  {settlement && (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <div className="rounded-md bg-muted p-1.5 text-center">
                        <div className="text-[10px] text-muted-foreground">سنوات التعثر</div>
                        <div className="text-xs font-bold tabular-nums">
                          {settlement.years.toFixed(1)}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted p-1.5 text-center">
                        <div className="text-[10px] text-muted-foreground">نسبة الخصم</div>
                        <div className="text-xs font-bold tabular-nums text-emerald-600">
                          {(settlement.rate * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="rounded-md bg-primary text-primary-foreground p-1.5 text-center">
                        <div className="text-[10px] opacity-80">مبلغ التسوية</div>
                        <div className="text-xs font-bold tabular-nums">
                          {formatCurrency(settlement.settle)}
                        </div>
                      </div>
                    </div>
                  )}
                </EditField>
              </div>
            );
          })()}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={!!state?.contacted}
                onCheckedChange={(v) => markDirtyUpdate({ contacted: v, lastContactedAt: v ? new Date().toISOString() : undefined })}
              />
              تم التواصل مع العميل
            </label>
            {state?.lastContactedAt && (
              <p className="text-xs text-muted-foreground">
                آخر تواصل: {new Date(state.lastContactedAt).toLocaleString("en-US")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">إضافة ملاحظة جديدة</label>
            <Textarea
              value={noteDraft}
              onChange={(e) => {
                setNoteDraft(e.target.value);
                if (e.target.value) setDirty(true);
              }}
              placeholder="أضف ملاحظة عن آخر محاولة، الوعد بالسداد، إلخ…"
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground">
              سيتم حفظ الملاحظة في السجل عند إغلاق صفحة العميل.
            </p>
          </div>

          {state?.noteLog?.length ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">سجل الملاحظات</label>
              <div className="space-y-1.5">
                {[...state.noteLog].reverse().map((n: any, i: number) => (
                  <div key={i} className="text-xs p-2 rounded-md bg-muted space-y-1">
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(n.date).toLocaleString("en-US")}
                    </div>
                    <div className="whitespace-pre-wrap break-words">{n.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {state?.logs?.length ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">سجل المحاولات</label>
              <div className="space-y-1">
                {[...state.logs].reverse().map((l: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted">
                    {l.channel === "call" ? <Phone className="size-3" /> : <MessageCircle className="size-3" />}
                    <span>{l.channel === "call" ? "اتصال" : "واتساب"}</span>
                    <span className="mr-auto text-muted-foreground">
                      {new Date(l.date).toLocaleString("en-US")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>

    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent className="max-w-xs">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-right">حفظ الإجراءات</AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            هل ترغب بحفظ الإجراءات التي قمت بها على هذا العميل؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmOpen(false)}>متابعة التعديل</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const trimmed = noteDraft.trim();
              if (trimmed) {
                const prev = state?.noteLog || [];
                onUpdate({
                  noteLog: [...prev, { date: new Date().toISOString(), text: trimmed }],
                });
              }
              setNoteDraft("");
              setConfirmOpen(false);
              setDirty(false);
              onClose();
              toast.success("تم حفظ الإجراءات");
            }}
          >
            حفظ وإغلاق
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <ThirdPartyDialog
      open={thirdPartyOpen}
      onOpenChange={setThirdPartyOpen}
      customerName={String(c["اسم العميل"] || "")}
      customerId={String(c["رقم الهوية"] || "")}
      settlementAmount={settlement?.settle ?? amount}
    />
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md border p-1.5">
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      <div className="text-xs font-medium truncate" title={String(value ?? "")}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function EditField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border p-1.5 space-y-1 ${className || ""}`}>
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      {children}
    </div>
  );
}
