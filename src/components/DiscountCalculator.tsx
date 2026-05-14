import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator, Settings, RotateCcw, Printer, Copy, Download, Lock, Save, FileUp, FileDown, Plus, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  DEFAULT_POLICY, AGE_LABELS, PF_CC_BUCKETS, AL_BUCKETS,
  loadPolicies, savePolicies, loadActiveId, saveActiveId,
  computeDebtAge, ageBucketFor, getDiscountRate, policyId, formatSAR,
  type DiscountPolicy, type ProductType, type CaseStatus, type CarStatus, type AgeBucket,
} from "@/lib/discount-policy";

const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function DiscountCalculator() {
  // === بيانات العميل ===
  const [name, setName] = useState("");
  const [idNo, setIdNo] = useState("");
  const [phone, setPhone] = useState("");
  const [product, setProduct] = useState<ProductType>("PF");
  const [caseStatus, setCaseStatus] = useState<CaseStatus>("no_case");
  const [carStatus, setCarStatus] = useState<CarStatus>("with_client");
  const [defaultDate, setDefaultDate] = useState(""); // تاريخ التعثر / التجميد
  const [todayDate, setTodayDate] = useState(new Date().toISOString().slice(0, 10));
  const [balance, setBalance] = useState<string>("");
  const [isSenior60, setIsSenior60] = useState(false);
  const [finalExit, setFinalExit] = useState(false);

  // === السياسات ===
  const [policies, setPolicies] = useState<Record<string, DiscountPolicy>>({});
  const [activeId, setActiveId] = useState<string>(policyId(DEFAULT_POLICY));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");

  useEffect(() => {
    setPolicies(loadPolicies());
    setActiveId(loadActiveId());
  }, []);

  const activePolicy: DiscountPolicy = policies[activeId] || DEFAULT_POLICY;

  // === حساب عمر الدين ===
  const debtAge = useMemo(() => {
    if (!defaultDate || !todayDate) return { days: 0, years: 0 };
    return computeDebtAge(defaultDate, todayDate);
  }, [defaultDate, todayDate]);

  const bucket: AgeBucket = useMemo(
    () => ageBucketFor(debtAge.years, product, { isSenior60, finalExit }),
    [debtAge.years, product, isSenior60, finalExit],
  );

  // === الحساب ===
  const result = useMemo(() => {
    const bal = parseFloat(balance.replace(/,/g, "")) || 0;
    if (!bal || !defaultDate) return null;
    const rate = getDiscountRate(activePolicy, product, caseStatus, carStatus, bucket);
    const discount = bal * rate;
    const settlement = bal - discount;
    return { bal, rate, discount, settlement };
  }, [balance, defaultDate, activePolicy, product, caseStatus, carStatus, bucket]);

  const reset = () => {
    setName(""); setIdNo(""); setPhone(""); setProduct("PF");
    setCaseStatus("no_case"); setCarStatus("with_client");
    setDefaultDate(""); setBalance("");
    setIsSenior60(false); setFinalExit(false);
  };

  const copySummary = async () => {
    if (!result) return toast.error("أدخل البيانات أولاً");
    const text = [
      `ملخص التسوية`,
      `العميل: ${name || "—"}`,
      `الهوية: ${idNo || "—"}`,
      `الجوال: ${phone || "—"}`,
      `المنتج: ${product}`,
      `حالة القضية: ${caseStatus === "no_case" ? "بدون قضية" : "بوجود قضية"}`,
      product === "AL" ? `حالة السيارة: ${carStatus === "with_client" ? "مع العميل" : "مسحوبة"}` : "",
      `عمر الدين: ${AGE_LABELS[bucket]} (${debtAge.days.toLocaleString("en-US")} يوم)`,
      `نسبة الخصم: ${(result.rate * 100).toFixed(0)}%`,
      `الرصيد القائم: ${formatSAR(result.bal)} ر.س`,
      `مبلغ الخصم: ${formatSAR(result.discount)} ر.س`,
      `مبلغ التسوية: ${formatSAR(result.settlement)} ر.س`,
      `السياسة: ${MONTHS_AR[activePolicy.month - 1]} ${activePolicy.year}`,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("تم نسخ الملخص");
  };

  const tryOpenSettings = () => {
    setAuthUser(""); setAuthPass(""); setAuthOpen(true);
  };

  const submitAuth = () => {
    if (authUser === ADMIN_USER && authPass === ADMIN_PASS) {
      setAuthOpen(false);
      setSettingsOpen(true);
      toast.success("مرحباً بك في لوحة الإعدادات");
    } else {
      toast.error("بيانات الدخول غير صحيحة");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="رجوع">
            <Link to="/">
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground grid place-items-center shadow-md">
            <Calculator className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">حاسبة الخصم</h1>
            <p className="text-xs text-muted-foreground">
              السياسة النشطة: {MONTHS_AR[activePolicy.month - 1]} {activePolicy.year}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={tryOpenSettings} className="gap-1">
            <Lock className="size-4" /> إدارة سياسة الخصم
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 space-y-5 print:p-0">
        {/* بيانات العميل */}
        <Card className="p-4 space-y-4 print:hidden">
          <h2 className="text-base font-bold flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            بيانات العميل
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="اسم العميل">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" />
            </Field>
            <Field label="رقم الهوية">
              <Input value={idNo} onChange={(e) => setIdNo(e.target.value)} placeholder="1xxxxxxxxx" inputMode="numeric" />
            </Field>
            <Field label="رقم الجوال">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" inputMode="numeric" />
            </Field>

            <Field label="نوع المنتج">
              <Select value={product} onValueChange={(v) => setProduct(v as ProductType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">التمويل الشخصي PF</SelectItem>
                  <SelectItem value="CC">البطاقة الائتمانية CC</SelectItem>
                  <SelectItem value="AL">التمويل التأجيري AL</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {product !== "AL" ? (
              <Field label="حالة القضية">
                <Select value={caseStatus} onValueChange={(v) => setCaseStatus(v as CaseStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_case">بدون قضية</SelectItem>
                    <SelectItem value="with_case">بوجود قضية</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field label="حالة السيارة">
                <Select value={carStatus} onValueChange={(v) => setCarStatus(v as CarStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="with_client">السيارة مع العميل</SelectItem>
                    <SelectItem value="repossessed">السيارة مسحوبة</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="تاريخ التعثر / التجميد">
              <Input type="date" value={defaultDate} onChange={(e) => setDefaultDate(e.target.value)} />
            </Field>
            <Field label="تاريخ اليوم">
              <Input type="date" value={todayDate} onChange={(e) => setTodayDate(e.target.value)} />
            </Field>
            <Field label="الرصيد القائم (ر.س)">
              <Input
                value={balance}
                onChange={(e) => setBalance(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0.00"
                inputMode="decimal"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isSenior60} onCheckedChange={setIsSenior60} />
              العمر +60 سنة
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={finalExit} onCheckedChange={setFinalExit} />
              خروج نهائي
            </label>
          </div>

          {defaultDate && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">عدد الأيام: {debtAge.days.toLocaleString("en-US")}</Badge>
              <Badge variant="secondary">عدد السنوات: {debtAge.years.toFixed(2)}</Badge>
              <Badge>الفئة: {AGE_LABELS[bucket]}</Badge>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={reset} variant="outline" size="sm" className="gap-1">
              <RotateCcw className="size-4" /> إعادة تعيين
            </Button>
            <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1">
              <Printer className="size-4" /> طباعة
            </Button>
            <Button onClick={copySummary} variant="outline" size="sm" className="gap-1">
              <Copy className="size-4" /> نسخ الملخص
            </Button>
          </div>
        </Card>

        {/* النتائج */}
        {result ? (
          <Card className="p-5 bg-gradient-to-br from-primary/5 via-background to-accent/10 border-primary/20">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              نتيجة التسوية
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              <ResultBox label="نسبة الخصم المعتمدة" value={`${(result.rate * 100).toFixed(0)}%`} big tone="primary" />
              <ResultBox label="مبلغ الخصم" value={`${formatSAR(result.discount)} ر.س`} tone="gold" />
              <ResultBox label="مبلغ التسوية النهائي" value={`${formatSAR(result.settlement)} ر.س`} big tone="success" />
              <ResultBox label="الرصيد قبل الخصم" value={`${formatSAR(result.bal)} ر.س`} />
              <ResultBox label="الرصيد بعد الخصم" value={`${formatSAR(result.settlement)} ر.س`} />
              <ResultBox label="السياسة المستخدمة" value={`${MONTHS_AR[activePolicy.month - 1]} ${activePolicy.year}`} />
            </div>

            <div className="mt-4 pt-4 border-t text-sm grid md:grid-cols-2 gap-2 text-muted-foreground">
              <div><span className="font-semibold text-foreground">العميل:</span> {name || "—"}</div>
              <div><span className="font-semibold text-foreground">المنتج:</span> {product}</div>
              <div>
                <span className="font-semibold text-foreground">
                  {product === "AL" ? "حالة السيارة:" : "حالة القضية:"}
                </span>{" "}
                {product === "AL"
                  ? (carStatus === "with_client" ? "السيارة مع العميل" : "السيارة مسحوبة")
                  : (caseStatus === "no_case" ? "بدون قضية" : "بوجود قضية")}
              </div>
              <div><span className="font-semibold text-foreground">عمر الدين:</span> {AGE_LABELS[bucket]}</div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            أدخل تاريخ التعثر والرصيد القائم لعرض نتيجة التسوية.
          </Card>
        )}
      </main>

      {/* نافذة المصادقة */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل دخول إدارة سياسة الخصم</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="اسم المستخدم">
              <Input value={authUser} onChange={(e) => setAuthUser(e.target.value)} />
            </Field>
            <Field label="كلمة المرور">
              <Input type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && submitAuth()} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthOpen(false)}>إلغاء</Button>
            <Button onClick={submitAuth}>دخول</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* لوحة الإعدادات */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5" /> إعدادات سياسة الخصم
            </DialogTitle>
          </DialogHeader>
          <PolicySettings
            policies={policies}
            activeId={activeId}
            onChange={(p, a) => {
              setPolicies(p);
              savePolicies(p);
              if (a) { setActiveId(a); saveActiveId(a); }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= مكونات مساعدة =============

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ResultBox({
  label, value, big, tone,
}: {
  label: string; value: string; big?: boolean;
  tone?: "primary" | "gold" | "success";
}) {
  const toneCls =
    tone === "primary" ? "text-primary" :
    tone === "gold" ? "text-[oklch(0.72_0.16_75)]" :
    tone === "success" ? "text-[oklch(0.55_0.16_150)]" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div className={`font-bold ${big ? "text-2xl" : "text-base"} ${toneCls}`}>{value}</div>
    </div>
  );
}

// ============= لوحة إعدادات السياسة =============

function PolicySettings({
  policies, activeId, onChange,
}: {
  policies: Record<string, DiscountPolicy>;
  activeId: string;
  onChange: (p: Record<string, DiscountPolicy>, activeId?: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(activeId);
  const [draft, setDraft] = useState<DiscountPolicy>(policies[activeId] || DEFAULT_POLICY);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setDraft(policies[selectedId] || DEFAULT_POLICY);
  }, [selectedId, policies]);

  const updateRate = (
    section: "PF_CC" | "AL",
    sub: string,
    bucket: AgeBucket,
    valuePct: string,
  ) => {
    const num = parseFloat(valuePct);
    if (isNaN(num)) return;
    if (num < 0 || num > 100) {
      toast.error("النسبة يجب أن تكون بين 0 و 100");
      return;
    }
    setDraft((d) => {
      const copy = JSON.parse(JSON.stringify(d)) as DiscountPolicy;
      (copy as any)[section][sub][bucket] = num / 100;
      return copy;
    });
  };

  const save = () => {
    const id = policyId(draft);
    const next = { ...policies, [id]: draft };
    onChange(next, id);
    toast.success("تم حفظ السياسة بنجاح");
  };

  const activate = () => {
    onChange(policies, selectedId);
    toast.success("تم تفعيل السياسة");
  };

  const restore = () => {
    if (!confirm("استعادة السياسة الافتراضية لهذا الشهر؟")) return;
    setDraft(JSON.parse(JSON.stringify(DEFAULT_POLICY)));
    toast.success("تم استعادة الإعدادات الافتراضية");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discount-policy-${policyId(draft)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const parsed = JSON.parse(String(fr.result)) as DiscountPolicy;
        if (!parsed.month || !parsed.year || !parsed.PF_CC || !parsed.AL) throw new Error("ملف غير صالح");
        setDraft(parsed);
        toast.success("تم استيراد السياسة، اضغط حفظ لتأكيدها");
      } catch (e: any) {
        toast.error("ملف غير صالح: " + (e?.message || ""));
      }
    };
    fr.readAsText(file);
  };

  const addNewPolicy = () => {
    const id = policyId({ month: newMonth, year: newYear });
    if (policies[id]) {
      setSelectedId(id);
      toast.info("هذه السياسة موجودة بالفعل");
      return;
    }
    const fresh: DiscountPolicy = { ...JSON.parse(JSON.stringify(DEFAULT_POLICY)), month: newMonth, year: newYear };
    const next = { ...policies, [id]: fresh };
    onChange(next);
    setSelectedId(id);
    toast.success("تم إنشاء سياسة جديدة");
  };

  return (
    <div className="space-y-4">
      {/* اختيار السياسة */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="السياسة">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(policies).map((p) => (
                <SelectItem key={policyId(p)} value={policyId(p)}>
                  {MONTHS_AR[p.month - 1]} {p.year} {policyId(p) === activeId ? " (نشطة)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-end gap-2">
          <Field label="شهر جديد">
            <Select value={String(newMonth)} onValueChange={(v) => setNewMonth(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_AR.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="السنة">
            <Input type="number" value={newYear} onChange={(e) => setNewYear(Number(e.target.value))} className="w-24" />
          </Field>
          <Button onClick={addNewPolicy} size="sm" variant="outline" className="gap-1">
            <Plus className="size-4" /> إضافة
          </Button>
        </div>
      </div>

      {/* جداول التعديل */}
      <Tabs defaultValue="pf_cc">
        <TabsList>
          <TabsTrigger value="pf_cc">PF / CC</TabsTrigger>
          <TabsTrigger value="al">التمويل التأجيري AL</TabsTrigger>
        </TabsList>

        <TabsContent value="pf_cc" className="space-y-4">
          <RateTable
            title="بدون قضية"
            buckets={PF_CC_BUCKETS}
            values={draft.PF_CC.no_case}
            onChange={(b, v) => updateRate("PF_CC", "no_case", b, v)}
          />
          <RateTable
            title="بوجود قضية"
            buckets={PF_CC_BUCKETS}
            values={draft.PF_CC.with_case}
            onChange={(b, v) => updateRate("PF_CC", "with_case", b, v)}
          />
        </TabsContent>

        <TabsContent value="al" className="space-y-4">
          <RateTable
            title="السيارة مع العميل"
            buckets={AL_BUCKETS}
            values={draft.AL.with_client}
            onChange={(b, v) => updateRate("AL", "with_client", b, v)}
          />
          <RateTable
            title="السيارة مسحوبة"
            buckets={AL_BUCKETS}
            values={draft.AL.repossessed}
            onChange={(b, v) => updateRate("AL", "repossessed", b, v)}
          />
        </TabsContent>
      </Tabs>

      {/* الأزرار */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button onClick={save} className="gap-1"><Save className="size-4" /> حفظ السياسة</Button>
        <Button onClick={activate} variant="outline" className="gap-1">تفعيل السياسة</Button>
        <Button onClick={restore} variant="outline" className="gap-1"><RotateCcw className="size-4" /> استعادة الافتراضي</Button>
        <Button onClick={exportJson} variant="outline" className="gap-1"><FileDown className="size-4" /> تصدير JSON</Button>
        <label>
          <input type="file" accept="application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
          <Button asChild variant="outline" className="gap-1 cursor-pointer">
            <span><FileUp className="size-4" /> استيراد JSON</span>
          </Button>
        </label>
      </div>
    </div>
  );
}

function RateTable({
  title, buckets, values, onChange,
}: {
  title: string;
  buckets: AgeBucket[];
  values: Partial<Record<AgeBucket, number>>;
  onChange: (b: AgeBucket, v: string) => void;
}) {
  return (
    <Card className="p-3">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {buckets.map((b) => (
          <div key={b} className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{AGE_LABELS[b]}</Label>
            <div className="relative">
              <Input
                type="number" min={0} max={100} step={1}
                value={values[b] != null ? Math.round((values[b] as number) * 100) : ""}
                onChange={(e) => onChange(b, e.target.value)}
                className="pl-7 text-center"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
