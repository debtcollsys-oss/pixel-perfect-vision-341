import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, Upload, UserPlus, Inbox, ArrowRight, Trash2, Eye, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/lib/wallet-store";
import collectors from "@/data/collectors.json";
import { formatCurrency, type Customer } from "@/lib/wallet-types";

type Collector = { supervisor: string; collector: string; employeeId: string };
const BASE_COLLECTORS = collectors as Collector[];

const EXTRA_KEY = "wallet:collectors:extra";
const REQ_KEY = "wallet:thirdparty:requests";

type ThirdPartyReq = {
  id: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  customerName: string;
  customerId: string;
  settlementAmount: number;
  salary: string;
  employer: string;
  region: string;
  city: string;
  ahli: any[];
  otherBanks: any[];
  obligation: number;
  totalDebt: number;
  documents: { salary: string | null; simah: string | null; najez: string | null };
  collector: { name?: string; employeeId?: string; supervisor?: string } | null;
  body: string;
};

type Tab = "home" | "wallet" | "members" | "requests";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          {tab !== "home" ? (
            <Button variant="ghost" size="icon" onClick={() => setTab("home")} aria-label="رجوع">
              <ArrowRight className="size-5" />
            </Button>
          ) : (
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <ShieldCheck className="size-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">لوحة تحكم الإدارة</h1>
            <p className="text-xs text-muted-foreground truncate">
              {tab === "home" && "اختر الإجراء المطلوب"}
              {tab === "wallet" && "إضافة المحفظة كاملة"}
              {tab === "members" && "إضافة أعضاء في القروب"}
              {tab === "requests" && "طلبات إرسال العملاء للطرف الثالث"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        {tab === "home" && <HomeGrid onSelect={setTab} />}
        {tab === "wallet" && <WalletUploadPanel />}
        {tab === "members" && <MembersPanel />}
        {tab === "requests" && <RequestsPanel />}
      </main>
    </div>
  );
}

function HomeGrid({ onSelect }: { onSelect: (t: Tab) => void }) {
  const pendingCount = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem(REQ_KEY) || "[]") as ThirdPartyReq[];
      return all.filter((r) => r.status === "pending").length;
    } catch { return 0; }
  }, []);

  const tiles: { id: Tab; title: string; desc: string; icon: any; badge?: number }[] = [
    { id: "wallet", title: "إضافة المحفظة كاملة", desc: "رفع ملف Excel لاستبدال بيانات المحفظة", icon: Upload },
    { id: "members", title: "إضافة أعضاء في القروب", desc: "تفعيل المحصلين للوصول إلى القروب", icon: UserPlus },
    { id: "requests", title: "استقبال طلبات الطرف الثالث", desc: "مراجعة الطلبات المقدمة من المحصلين", icon: Inbox, badge: pendingCount },
  ];

  return (
    <div className="grid gap-3">
      {tiles.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className="text-right rounded-2xl border bg-card p-4 hover:bg-accent transition flex items-center gap-4 shadow-sm"
        >
          <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <t.icon className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base flex items-center gap-2">
              {t.title}
              {t.badge ? <Badge variant="destructive" className="h-5 text-[10px]">{t.badge}</Badge> : null}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function WalletUploadPanel() {
  const { meta, replaceData, hydrated } = useWallet();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleUpload = async (file: File) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Customer>(sheet, { defval: null });
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="text-sm">
        رفع ملف Excel جديد سيستبدل المحفظة الحالية بالكامل لجميع المستخدمين.
      </div>
      {hydrated && (
        <div className="text-xs text-muted-foreground rounded-md border p-3 space-y-1">
          <div>الملف الحالي: <span className="font-medium text-foreground">{meta.fileName}</span></div>
          <div>عدد العملاء: <span className="font-medium text-foreground tabular-nums">{meta.count}</span></div>
          {meta.uploadedAt && (
            <div>آخر رفع: <span className="font-medium text-foreground">{new Date(meta.uploadedAt).toLocaleString("en-US")}</span></div>
          )}
        </div>
      )}
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
      <Button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full h-11">
        <Upload className="size-4 ml-2" />
        {busy ? "جاري الرفع…" : "اختيار ملف Excel ورفعه"}
      </Button>
    </Card>
  );
}

function MembersPanel() {
  const [extras, setExtras] = useState<Collector[]>([]);
  const [group, setGroup] = useState<string[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    try { setExtras(JSON.parse(localStorage.getItem(EXTRA_KEY) || "[]")); } catch {}
    try { setGroup(JSON.parse(localStorage.getItem("wallet:group:members") || "[]")); } catch {}
  }, []);

  const all = useMemo(() => {
    const map = new Map<string, Collector>();
    [...BASE_COLLECTORS, ...extras].forEach((c) => map.set(c.employeeId, c));
    return Array.from(map.values());
  }, [extras]);

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!t) return all;
    return all.filter(
      (c) =>
        c.collector.includes(t) ||
        c.supervisor.includes(t) ||
        c.employeeId.includes(t),
    );
  }, [all, q]);

  const persistGroup = (next: string[]) => {
    setGroup(next);
    localStorage.setItem("wallet:group:members", JSON.stringify(next));
  };

  const toggle = (eid: string) => {
    if (group.includes(eid)) persistGroup(group.filter((x) => x !== eid));
    else persistGroup([...group, eid]);
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-2">
        <div className="text-xs text-muted-foreground">
          فعّل المحصلين الذين تريد إضافتهم إلى القروب. المحصل المفعّل فقط يمكنه فتح خانة القروب.
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو الرقم الوظيفي…"
          className="h-9"
        />
        <div className="text-[11px] text-muted-foreground">
          أعضاء القروب: <span className="font-bold text-foreground tabular-nums">{group.length}</span> / {all.length}
        </div>
      </Card>
      <Card className="p-2 max-h-[60vh] overflow-y-auto">
        <ul className="divide-y">
          {filtered.map((c) => {
            const inGroup = group.includes(c.employeeId);
            return (
              <li key={c.employeeId} className="flex items-center gap-3 py-2 px-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.collector}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {c.supervisor} · <span className="tabular-nums">{c.employeeId}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={inGroup ? "default" : "outline"}
                  onClick={() => toggle(c.employeeId)}
                >
                  {inGroup ? "في القروب ✓" : "إضافة"}
                </Button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">لا توجد نتائج</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function RequestsPanel() {
  const [items, setItems] = useState<ThirdPartyReq[]>([]);
  const [open, setOpen] = useState<ThirdPartyReq | null>(null);

  const load = () => {
    try { setItems(JSON.parse(localStorage.getItem(REQ_KEY) || "[]")); } catch { setItems([]); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = (id: string, status: ThirdPartyReq["status"]) => {
    const next = items.map((r) => (r.id === id ? { ...r, status } : r));
    setItems(next);
    localStorage.setItem(REQ_KEY, JSON.stringify(next));
    if (open?.id === id) setOpen({ ...open, status });
    toast.success(status === "approved" ? "تمت الموافقة" : status === "rejected" ? "تم الرفض" : "تم التحديث");
  };

  const remove = (id: string) => {
    const next = items.filter((r) => r.id !== id);
    setItems(next);
    localStorage.setItem(REQ_KEY, JSON.stringify(next));
    if (open?.id === id) setOpen(null);
  };

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground text-sm">
        لا توجد طلبات حالياً
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((r) => (
          <Card key={r.id} className="p-3">
            <div className="flex items-start gap-3">
              <StatusPill status={r.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold truncate">{r.customerName}</div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{r.id}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  هوية: <span className="tabular-nums">{r.customerId}</span> ·
                  {" "}إجمالي: <span className="tabular-nums">{formatCurrency(r.totalDebt)}</span> SAR
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  من: {r.collector?.name || "—"}
                  {r.collector?.employeeId ? ` (${r.collector.employeeId})` : ""}
                  {" · "}
                  {new Date(r.createdAt).toLocaleString("en-US")}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(r)} aria-label="عرض">
                <Eye className="size-4" />
              </Button>
            </div>
            {r.status === "pending" && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")}>
                  <XCircle className="size-4 ml-1" /> رفض
                </Button>
                <Button size="sm" onClick={() => updateStatus(r.id, "approved")}>
                  <CheckCircle2 className="size-4 ml-1" /> موافقة
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تفاصيل الطلب {open?.id}</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <StatusPill status={open.status} />
                <span className="text-muted-foreground">{new Date(open.createdAt).toLocaleString("en-US")}</span>
              </div>
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-[11px] leading-relaxed font-sans">
{open.body}
              </pre>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => remove(open.id)}>
                  <Trash2 className="size-4 ml-1" /> حذف
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(open.id, "rejected")}>
                  <XCircle className="size-4 ml-1" /> رفض
                </Button>
                <Button size="sm" onClick={() => updateStatus(open.id, "approved")}>
                  <CheckCircle2 className="size-4 ml-1" /> موافقة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusPill({ status }: { status: ThirdPartyReq["status"] }) {
  const map = {
    pending: { icon: Clock, label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    approved: { icon: CheckCircle2, label: "مقبول", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { icon: XCircle, label: "مرفوض", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  } as const;
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${m.cls}`}>
      <Icon className="size-3" /> {m.label}
    </span>
  );
}
