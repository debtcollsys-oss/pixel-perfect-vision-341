import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Inbox,
  Send,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Mic,
  StopCircle,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { QuickActionsSlider, type QuickKey } from "@/components/QuickActionsSlider";
import { useWallet, useCustomerStates } from "@/lib/wallet-store";
import {
  customerKey,
  formatCurrency,
  type Customer,
} from "@/lib/wallet-types";


import { getSession } from "@/components/LoginGate";
import {
  addMessage,
  getAllCollectors,
  isInGroup,
  readMessages,
  writeMessages,
  type Attachment,
  type Message,
} from "@/lib/messages-store";

export function QuickActionsHub() {
  const session = getSession();
  const employeeId = session?.employeeId;
  const groupEnabled = isInGroup(employeeId);
  const navigate = useNavigate();

  const [open, setOpen] = useState<QuickKey | null>(null);
  const [mailUnread, setMailUnread] = useState(0);

  useEffect(() => {
    if (!employeeId) return setMailUnread(0);
    const refresh = () => {
      const all = readMessages();
      setMailUnread(all.filter((m) => m.toEmployeeId === employeeId && !m.read).length);
    };
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [employeeId, open]);

  return (
    <>
      <QuickActionsSlider
        groupEnabled={groupEnabled}
        mailBadge={mailUnread}
        onSelect={(k) => {
          if (k === "group" && !groupEnabled) {
            toast.error("لم تتم إضافتك إلى القروب بعد. يرجى مراجعة الإدارة.");
            return;
          }
          if (k === "mail") {
            navigate({ to: "/mail" });
            return;
          }
          setOpen(k);
        }}
      />

      <PromisesDialog open={open === "promises"} onClose={() => setOpen(null)} />
      <RequestsDialog
        open={open === "exemptions"}
        onClose={() => setOpen(null)}
        kind="exemption"
      />
      <RequestsDialog
        open={open === "reschedules"}
        onClose={() => setOpen(null)}
        kind="reschedule"
      />
      <FullWalletDialog open={open === "wallet"} onClose={() => setOpen(null)} />
      <GroupDialog open={open === "group"} onClose={() => setOpen(null)} />
    </>
  );
}

/* ---------- Customer-list dialogs ---------- */

function useFilteredCustomers(
  predicate: (c: Customer, st: any) => boolean,
): Customer[] {
  const { customers } = useWallet();
  const { states } = useCustomerStates();
  return useMemo(
    () =>
      customers.filter((c) => predicate(c, states[customerKey(c)])),
    [customers, states, predicate],
  );
}

function CustomersList({ items, emptyText }: { items: Customer[]; emptyText: string }) {
  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground px-1">
        إجمالي: <span className="tabular-nums font-bold text-foreground">{items.length}</span>
      </div>
      {items.map((c) => (
        <Card key={customerKey(c)} className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {c["اسم العميل"] || "بدون اسم"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                هوية: <span className="tabular-nums">{c["رقم الهوية"] || "—"}</span> ·
                حساب: <span className="tabular-nums">{c["رقم الحساب"] || "—"}</span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {c["المنتج"] || "—"} · {c["عمر الدين"] || "—"}
              </div>
            </div>
            <div className="text-left shrink-0">
              <div className="text-sm font-bold text-primary tabular-nums">
                {formatCurrency(c["المبلغ"])}
              </div>
              <div className="text-[10px] text-muted-foreground">SAR</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PromisesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useFilteredCustomers(
    (c, st) => ((st?.edits?.["الاكشن"] ?? c["الاكشن"]) === "وعد سداد"),
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">وعود السداد</DialogTitle>
        </DialogHeader>
        <CustomersList items={items} emptyText="لا توجد وعود سداد مسجلة" />
      </DialogContent>
    </Dialog>
  );
}

function RequestsDialog({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: "exemption" | "reschedule";
}) {
  const items = useFilteredCustomers((c) => {
    const col = kind === "exemption" ? c["طلب اعفاء"] : c["طلب جدولة"];
    return col != null && String(col).trim() !== "";
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {kind === "exemption" ? "طلبات الإعفاء" : "طلبات الجدولة"}
          </DialogTitle>
        </DialogHeader>
        <CustomersList
          items={items}
          emptyText={kind === "exemption" ? "لا توجد طلبات إعفاء" : "لا توجد طلبات جدولة"}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Full wallet table ---------- */

const ACTION_OPTIONS = [
  "وعد سداد",
  "بيانات خاطئة",
  "Call Back",
  "رافض السداد",
  "تم السداد",
] as const;

const YES_NO_OPTIONS = ["Yes", "No"] as const;

function FullWalletDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { customers } = useWallet();
  const { states, update } = useCustomerStates();

  const cols: { h: string; k: keyof Customer | string[] }[] = [
    { h: "رقم الحساب", k: "رقم الحساب" },
    { h: "مبلغ المديونية", k: "مبلغ المديونية" },
    { h: "Note", k: "Note" as any },
    { h: "الاكشن", k: "الاكشن" },
    { h: "الرقم الوظيفي للمحصل", k: "الرقم الوظيفي للمحصل" },
    { h: "اسم المحصل", k: "اسم المحصل" },
    { h: "الرقم الوظيفي للمشرف", k: "الرقم الوظيفي للمشرف" },
    { h: "اسم المشرف", k: "اسم المشرف" },
    { h: "عدد ايام التعثر", k: "عدد ايام التعثر" },
    { h: "نوع المنتج", k: "نوع المنتج" },
    { h: "تاريخ التجميد", k: "تاريخ التجميد" },
    { h: "رقم الهوية", k: "رقم الهوية" },
    { h: "اسم العميل", k: "اسم العميل" },
    { h: "رقم الجوال", k: "رقم الجوال" },
    { h: "عميل متوفي", k: "عميل متوفي" },
    { h: "عميل رواتب", k: "عميل رواتب" },
    { h: "تقييم الأعمال", k: "تقييم الأعمال" as any },
    { h: "jWO-DT", k: "jWO-DT" as any },
    { h: "رقم القضية", k: ["رقم القضية", "CaseNo. رقم القضية"] },
    { h: "اسم المحكمة", k: "اسم المحكمة" },
    { h: "رقم طلب سيبل", k: ["رقم طلب سيبل", "طلب اعفاء"] },
    { h: "نوع الطلب", k: "نوع الطلب" as any },
    { h: "الوصف", k: "الوصف" as any },
    { h: "مرجع الحجز التنفيذي", k: "مرجع الحجز التنفيذي" },
    { h: "ارصدة محجوزه", k: ["ارصدة محجوزه", "ارصده محجوزه"] },
    { h: "عميل مشترك", k: "عميل مشترك" as any },
    { h: "طلب جدولة", k: "طلب جدولة" },
    { h: "التثبيت", k: "التثبيت" },
  ];

  const readRaw = (row: Customer, k: string | string[]) => {
    const keys = Array.isArray(k) ? k : [k];
    for (const key of keys) {
      const v = (row as any)[key];
      if (v != null && v !== "") return v;
    }
    return null;
  };

  const readEdited = (row: Customer, st: any, k: string | string[]) => {
    const keys = Array.isArray(k) ? k : [k];
    const edits = st?.edits || {};
    for (const key of keys) {
      if (edits[key] != null && edits[key] !== "") return edits[key];
    }
    return readRaw(row, k);
  };

  const patchEdit = (row: Customer, field: string, value: any) => {
    const key = customerKey(row);
    if (!key) return;
    const st = states[key];
    update(key, { edits: { ...(st?.edits || {}), [field]: value } });
  };

  const yesNoValue = (v: any): "Yes" | "No" | "" => {
    if (v == null || v === "") return "";
    const s = String(v).trim().toLowerCase();
    if (["yes", "y", "true", "1", "نعم"].includes(s)) return "Yes";
    if (["no", "n", "false", "0", "لا"].includes(s)) return "No";
    return s.includes("نعم") ? "Yes" : s.includes("لا") ? "No" : "";
  };

  // Convert any phone-ish string to international +966XXXXXXXXX format for display
  const intlPhone = (v: any): string => {
    if (v == null || v === "") return "";
    let s = String(v).replace(/\D/g, "");
    if (!s) return "";
    if (s.startsWith("00")) s = s.slice(2);
    if (s.startsWith("05") && s.length === 10) s = "966" + s.slice(1);
    else if (s.startsWith("5") && s.length === 9) s = "966" + s;
    else if (!s.startsWith("966")) {
      // assume KSA if 9 digits starting with 5; else just prefix
      if (s.length === 9 && s.startsWith("5")) s = "966" + s;
    }
    return "+" + s;
  };

  const cellCls =
    "border px-1 py-0.5 whitespace-nowrap tabular-nums align-middle text-center text-[10px]";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden p-0" dir="rtl">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-right">المحفظة كاملة ({customers.length} عميل)</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-[10px] border-collapse">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="border px-1 py-1 text-center font-bold">#</th>
                {cols.map((c) => (
                  <th key={c.h} className="border px-1 py-1 text-center font-bold whitespace-nowrap">
                    {c.h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((row, i) => {
                const st = states[customerKey(row)];
                return (
                  <tr key={i} className="odd:bg-background even:bg-muted/30 hover:bg-accent/40">
                    <td className={cellCls + " text-muted-foreground"}>{i + 1}</td>
                    {cols.map((c) => {
                      const v = readEdited(row, st, c.k as any);
                      const display = v == null ? "" : String(v);

                      // ---- Editable: الاكشن (dropdown) ----
                      if (c.h === "الاكشن") {
                        return (
                          <td key={c.h} className={cellCls}>
                            <Select
                              value={display || undefined}
                              onValueChange={(val) => patchEdit(row, "الاكشن", val)}
                            >
                              <SelectTrigger className="h-6 min-w-[100px] text-[10px] px-1 mx-auto">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_OPTIONS.map((o) => (
                                  <SelectItem key={o} value={o} className="text-[11px]">
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        );
                      }

                      // ---- Editable: تاريخ التجميد (date) ----
                      if (c.h === "تاريخ التجميد") {
                        const dateVal = display ? String(display).slice(0, 10) : "";
                        return (
                          <td key={c.h} className={cellCls}>
                            <Input
                              type="date"
                              value={dateVal}
                              onChange={(ev) =>
                                patchEdit(row, "تاريخ التجميد", ev.target.value || null)
                              }
                              className="h-6 text-[10px] px-1 min-w-[110px] mx-auto"
                            />
                          </td>
                        );
                      }

                      // ---- Editable: Yes/No fields ----
                      if (
                        c.h === "عميل متوفي" ||
                        c.h === "عميل رواتب" ||
                        c.h === "تقييم الأعمال"
                      ) {
                        const yn = yesNoValue(v);
                        return (
                          <td key={c.h} className={cellCls}>
                            <Select
                              value={yn || undefined}
                              onValueChange={(val) => patchEdit(row, c.h, val)}
                            >
                              <SelectTrigger className="h-6 min-w-[60px] text-[10px] px-1 mx-auto">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {YES_NO_OPTIONS.map((o) => (
                                  <SelectItem key={o} value={o} className="text-[11px]">
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        );
                      }

                      // ---- Editable: رقم القضية (digits only) ----
                      if (c.h === "رقم القضية") {
                        return (
                          <td key={c.h} className={cellCls}>
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={display}
                              onChange={(ev) => {
                                const onlyDigits = ev.target.value.replace(/\D/g, "");
                                patchEdit(row, "رقم القضية", onlyDigits || null);
                              }}
                              className="h-6 text-[10px] px-1 min-w-[90px] mx-auto"
                            />
                          </td>
                        );
                      }

                      // ---- Phone: international format ----
                      if (c.h === "رقم الجوال") {
                        return (
                          <td key={c.h} className={cellCls}>
                            {intlPhone(v)}
                          </td>
                        );
                      }

                      // ---- Currency (right-aligned only column) ----
                      if (c.h === "مبلغ المديونية") {
                        return (
                          <td key={c.h} className={cellCls.replace("text-center", "text-right")}>
                            {v == null ? "" : formatCurrency(v as number)}
                          </td>
                        );
                      }

                      // ---- Default: plain display, empty when null ----
                      return (
                        <td key={c.h} className={cellCls}>
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/* ---------- Mail dialog ---------- */

export function MailPage() {
  const session = getSession();
  const me = session?.employeeId || "";
  const myName = session?.name || me;
  const [tab, setTab] = useState<"compose" | "inbox" | "sent">("compose");
  const [messages, setMessages] = useState<Message[]>([]);
  const [openMsg, setOpenMsg] = useState<Message | null>(null);

  const refresh = () => setMessages(readMessages());
  useEffect(() => {
    refresh();
  }, []);

  const inbox = messages.filter((m) => m.toEmployeeId === me);
  const sent = messages.filter((m) => m.fromEmployeeId === me);

  const markRead = (id: string) => {
    const all = readMessages().map((m) => (m.id === id ? { ...m, read: true } : m));
    writeMessages(all);
    setMessages(all);
  };

  const remove = (id: string) => {
    const all = readMessages().filter((m) => m.id !== id);
    writeMessages(all);
    setMessages(all);
    if (openMsg?.id === id) setOpenMsg(null);
  };

  return (
    <div dir="rtl" className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="compose">
            <Plus className="size-3 ml-1" /> رسالة جديدة
          </TabsTrigger>
          <TabsTrigger value="inbox">
            <Inbox className="size-3 ml-1" /> الوارد
            {inbox.filter((m) => !m.read).length > 0 && (
              <Badge className="mr-1 h-4 px-1 text-[10px]" variant="destructive">
                {inbox.filter((m) => !m.read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="size-3 ml-1" /> المرسل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <Compose
            fromEmployeeId={me}
            fromName={myName}
            onSent={() => {
              refresh();
              setTab("sent");
              toast.success("تم إرسال الرسالة");
            }}
          />
        </TabsContent>

        <TabsContent value="inbox" className="mt-4">
          <MessageList
            items={inbox}
            showFrom
            onOpen={(m) => {
              if (!m.read) markRead(m.id);
              setOpenMsg(m);
            }}
            onDelete={remove}
          />
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <MessageList items={sent} onOpen={setOpenMsg} onDelete={remove} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!openMsg} onOpenChange={(o) => !o && setOpenMsg(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {openMsg?.fromName} → {openMsg?.toName}
            </DialogTitle>
          </DialogHeader>
          {openMsg && (
            <div className="space-y-3 text-sm">
              <div className="text-[11px] text-muted-foreground">
                {new Date(openMsg.createdAt).toLocaleString("en-US")}
              </div>
              {openMsg.body && (
                <div className="rounded-md bg-muted/40 p-3 whitespace-pre-wrap">
                  {openMsg.body}
                </div>
              )}
              <AttachmentsView attachments={openMsg.attachments} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageList({
  items,
  showFrom,
  onOpen,
  onDelete,
}: {
  items: Message[];
  showFrom?: boolean;
  onOpen: (m: Message) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0)
    return <div className="py-8 text-center text-sm text-muted-foreground">لا توجد رسائل</div>;
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <Card key={m.id} className={`p-3 ${!m.read && showFrom ? "border-primary/60 bg-primary/5" : ""}`}>
          <button onClick={() => onOpen(m)} className="w-full text-right">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-sm flex-1 truncate">
                {showFrom ? m.fromName : `إلى: ${m.toName}`}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(m.createdAt).toLocaleDateString("en-US")}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate mt-1">
              {m.body || (m.attachments.length > 0 ? `📎 ${m.attachments.length} مرفق` : "—")}
            </div>
          </button>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(m.id)}
              className="h-7 text-destructive"
            >
              <Trash2 className="size-3 ml-1" /> حذف
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Compose({
  fromEmployeeId,
  fromName,
  onSent,
}: {
  fromEmployeeId: string;
  fromName: string;
  onSent: () => void;
}) {
  const collectors = useMemo(
    () => getAllCollectors().filter((c) => c.employeeId !== fromEmployeeId),
    [fromEmployeeId],
  );
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [atts, setAtts] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fileToAttachment = (file: File, kind: Attachment["kind"]): Promise<Attachment> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () =>
        resolve({ name: file.name, type: file.type, kind, dataUrl: String(r.result) });
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const handleFiles = async (files: FileList | null, kind: Attachment["kind"]) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: الحد الأقصى 5MB`);
        continue;
      }
      next.push(await fileToAttachment(f, kind));
    }
    setAtts((a) => [...a, ...next]);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        const att = await fileToAttachment(file, "audio");
        setAtts((a) => [...a, att]);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast.error("تعذر الوصول إلى الميكروفون");
    }
  };
  const stopRec = () => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  };

  const send = () => {
    if (!to) return toast.error("اختر المستلم");
    if (!body.trim() && atts.length === 0) return toast.error("أدخل نصاً أو أرفق ملفاً");
    const recipient = collectors.find((c) => c.employeeId === to);
    addMessage({
      id: `M${Date.now()}`,
      fromEmployeeId,
      fromName,
      toEmployeeId: to,
      toName: recipient?.collector || to,
      body: body.trim(),
      attachments: atts,
      createdAt: new Date().toISOString(),
      read: false,
    });
    setTo("");
    setBody("");
    setAtts([]);
    onSent();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium">المستلم</label>
        <Select value={to} onValueChange={setTo}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="اختر اسم المستلم" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {collectors.map((c) => (
              <SelectItem key={c.employeeId} value={c.employeeId}>
                {c.collector}{" "}
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  ({c.employeeId})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">الرسالة</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="اكتب رسالتك…"
          rows={4}
        />
      </div>

      {atts.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium">المرفقات ({atts.length})</div>
          <div className="space-y-1.5">
            {atts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs rounded-md border p-2">
                {a.kind === "image" ? (
                  <ImageIcon className="size-4" />
                ) : a.kind === "audio" ? (
                  <Mic className="size-4" />
                ) : (
                  <Paperclip className="size-4" />
                )}
                <span className="flex-1 truncate">{a.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => setAtts((arr) => arr.filter((_, j) => j !== i))}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files, "image");
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files, "file");
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()}>
          <ImageIcon className="size-4 ml-1" /> صورة
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip className="size-4 ml-1" /> ملف
        </Button>
        {!recording ? (
          <Button type="button" variant="outline" size="sm" onClick={startRec}>
            <Mic className="size-4 ml-1" /> تسجيل صوتي
          </Button>
        ) : (
          <Button type="button" variant="destructive" size="sm" onClick={stopRec}>
            <StopCircle className="size-4 ml-1" /> إيقاف التسجيل
          </Button>
        )}
      </div>

      <Button onClick={send} className="w-full">
        <Send className="size-4 ml-1" /> إرسال
      </Button>
    </div>
  );
}

function AttachmentsView({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium">المرفقات</div>
      {attachments.map((a, i) => (
        <div key={i} className="rounded-md border p-2 space-y-1">
          <div className="text-[11px] text-muted-foreground truncate">{a.name}</div>
          {a.kind === "image" && (
            <img src={a.dataUrl} alt={a.name} className="max-h-64 rounded mx-auto" />
          )}
          {a.kind === "audio" && (
            <audio controls src={a.dataUrl} className="w-full" />
          )}
          {a.kind === "file" && (
            <a
              href={a.dataUrl}
              download={a.name}
              className="text-xs text-primary underline inline-flex items-center gap-1"
            >
              <Paperclip className="size-3" /> تحميل الملف
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Group dialog ---------- */

function GroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = getSession();
  const me = session?.employeeId || "";
  const myName = session?.name || me;
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!open) return;
    const all = readMessages().filter((m) => m.toEmployeeId === "GROUP");
    setMessages(all);
  }, [open]);

  const send = () => {
    if (!body.trim()) return;
    const m: Message = {
      id: `G${Date.now()}`,
      fromEmployeeId: me,
      fromName: myName,
      toEmployeeId: "GROUP",
      toName: "القروب",
      body: body.trim(),
      attachments: [],
      createdAt: new Date().toISOString(),
    };
    addMessage(m);
    setMessages((arr) => [m, ...arr]);
    setBody("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">قروب المحصلين</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب رسالة للقروب…"
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <Button onClick={send}>
              <Send className="size-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {messages.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                لا توجد رسائل في القروب
              </div>
            )}
            {messages.map((m) => (
              <Card key={m.id} className={`p-3 ${m.fromEmployeeId === me ? "bg-primary/10" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold">{m.fromName}</span>
                  <span className="text-[10px] text-muted-foreground mr-auto">
                    {new Date(m.createdAt).toLocaleString("en-US")}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
