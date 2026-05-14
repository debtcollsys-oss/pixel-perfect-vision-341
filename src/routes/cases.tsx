import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Search, Scale, Loader2, Copy, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useCases, searchCases, type CaseRecord } from "@/lib/cases-store";
import { formatCurrency } from "@/lib/wallet-types";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "ملف القضايا — البحث وعرض البيانات" },
      { name: "description", content: "بحث في ملف القضايا برقم الهوية أو رقم الحساب أو رقم القضية." },
    ],
  }),
  component: CasesPage,
});

type SearchType = "customerId" | "account" | "caseNo";

const TYPE_LABEL: Record<SearchType, string> = {
  customerId: "رقم الهوية",
  account: "رقم الحساب",
  caseNo: "رقم القضية",
};

function CasesPage() {
  const { data, loading, error } = useCases();
  const [type, setType] = useState<SearchType>("customerId");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CaseRecord[] | null>(null);
  const [openCase, setOpenCase] = useState<CaseRecord | null>(null);

  const onSearch = () => {
    if (!data) return;
    if (!term.trim()) {
      toast.error("أدخل قيمة البحث");
      return;
    }
    const r = searchCases(data, type, term);
    setResults(r);
    if (r.length === 0) toast.error("لا توجد نتائج مطابقة");
    else if (r.length === 1) setOpenCase(r[0]);
  };

  const customerName = useMemo(() => {
    if (!results || results.length === 0) return null;
    return results[0]?.["Customer ID"] ?? null;
  }, [results]);

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="رجوع">
            <Link to="/">
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Scale className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">ملف القضايا</h1>
            <p className="text-xs text-muted-foreground">
              {data ? `${data.records.length.toLocaleString("en-US")} قضية محمّلة` : loading ? "جارِ التحميل..." : error || ""}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 space-y-5">
        <Card className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={type} onValueChange={(v) => setType(v as SearchType)}>
              <SelectTrigger className="sm:w-[180px] h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customerId">رقم الهوية</SelectItem>
                <SelectItem value="account">رقم الحساب</SelectItem>
                <SelectItem value="caseNo">رقم القضية</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                placeholder={`أدخل ${TYPE_LABEL[type]}…`}
                className="pr-9 h-11"
                inputMode="numeric"
              />
              {term && (
                <button
                  onClick={() => setTerm("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button onClick={onSearch} className="h-11 sm:w-32" disabled={loading || !data}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "بحث"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            البحث الأساسي عبر <b>رقم الهوية</b> — يعرض جميع قضايا العميل المرتبطة بنفس الهوية.
          </p>
        </Card>

        {results && results.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {results.length.toLocaleString("en-US")} قضية للعميل
                {customerName ? ` — هوية ${customerName}` : ""}
              </h2>
              <Badge variant="secondary">{TYPE_LABEL[type]}: {term}</Badge>
            </div>
            {results.map((rec, i) => (
              <CaseRow key={i} rec={rec} onOpen={() => setOpenCase(rec)} />
            ))}
          </section>
        )}
      </main>

      <CaseDialog rec={openCase} onClose={() => setOpenCase(null)} />
      <Toaster position="top-center" richColors />
    </div>
  );
}

function CaseRow({ rec, onOpen }: { rec: CaseRecord; onOpen: () => void }) {
  return (
    <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer" onClick={onOpen}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">قضية رقم {rec["CaseNo."] || "—"}</span>
            {rec["Product"] && <Badge variant="outline">{rec["Product"]}</Badge>}
            {rec["BUCKET"] && <Badge variant="secondary">{rec["BUCKET"]}</Badge>}
            {rec["Account Status"] && (
              <Badge variant={rec["Account Status"] === "Enable" ? "default" : "destructive"}>
                {rec["Account Status"]}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>حساب: {rec["ACCOUNT_NUMBER"] || "—"}</span>
            <span>هوية: {rec["Customer ID"] || "—"}</span>
            {rec["اسم المحكمة"] && <span>· {rec["اسم المحكمة"]}</span>}
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="font-bold text-primary tabular-nums">{formatCurrency(rec["BALANCE"])}</div>
          <div className="text-[10px] text-muted-foreground">الرصيد</div>
        </div>
      </div>
    </Card>
  );
}

const FIELD_GROUPS: { title: string; fields: string[] }[] = [
  { title: "بيانات العميل والحساب", fields: ["Customer ID", "ACCOUNT_NUMBER", "Bank", "Product", "Agency"] },
  { title: "تفاصيل المديونية", fields: ["PRINCIPAL", "BALANCE", "BUCKET", "DT_OPENED", "Account Status"] },
  { title: "بيانات القضية", fields: ["CaseNo.", "اسم المحكمة", "اسم الدائرة", "المحامي", "Action"] },
  { title: "ملاحظات", fields: ["NOTE", "إجراءات بيع العقار", "ملاحظات الحالية في بيع العقار"] },
];

const CURRENCY_FIELDS = new Set(["PRINCIPAL", "BALANCE"]);

function CaseDialog({ rec, onClose }: { rec: CaseRecord | null; onClose: () => void }) {
  if (!rec) return null;
  const copyAll = () => {
    const lines = FIELD_GROUPS.flatMap((g) =>
      g.fields.map((f) => `${f}: ${formatVal(f, rec[f])}`),
    );
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("تم نسخ بيانات القضية");
  };
  return (
    <Dialog open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Scale className="size-5 text-primary" />
            قضية رقم {rec["CaseNo."] || "—"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {FIELD_GROUPS.map((g) => (
            <div key={g.title} className="space-y-2">
              <h3 className="text-sm font-semibold text-primary border-b pb-1">{g.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {g.fields.map((f) => (
                  <div key={f} className="text-sm">
                    <div className="text-xs text-muted-foreground">{f}</div>
                    <div className="font-medium break-words">{formatVal(f, rec[f])}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={copyAll}>
            <Copy className="size-4 ml-2" />
            نسخ كامل بيانات القضية
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatVal(field: string, v: any): string {
  if (v == null || v === "") return "—";
  if (CURRENCY_FIELDS.has(field) && typeof v === "number") return formatCurrency(v);
  return String(v);
}
