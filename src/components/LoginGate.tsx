import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCog, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import collectors from "@/data/collectors.json";
import { supabase } from "@/integrations/supabase/client";
import type { Session as SupabaseSession, User as SupabaseUser } from "@supabase/supabase-js";

const ADMIN_EMPLOYEE_ID = "972559";

type Collector = { supervisor: string; collector: string; employeeId: string };
const COLLECTORS = collectors as Collector[];

export type Session = {
  role: "collector" | "admin";
  employeeId: string;
  name?: string;
  supervisor?: string;
  loginAt: string;
};

const synthEmail = (eid: string) => `${eid.trim()}@wallet.local`;

let cachedSession: Session | null = null;

export function getSession(): Session | null {
  return cachedSession;
}

export function clearSession() {
  void supabase.auth.signOut().then(() => {
    cachedSession = null;
    window.location.reload();
  });
}

async function loadProfile(uid: string): Promise<Session | null> {
  const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid),
  ]);
  if (profileError) throw profileError;
  if (rolesError) throw rolesError;
  if (!profile) return null;
  const role: "admin" | "collector" =
    roles?.some((r: any) => r.role === "admin") ? "admin" : "collector";
  return {
    role,
    employeeId: profile.employee_id,
    name: profile.name ?? undefined,
    supervisor: profile.supervisor ?? undefined,
    loginAt: new Date().toISOString(),
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sessionFromAuthUser(user: SupabaseUser): Session | null {
  const emailId = user.email?.endsWith("@wallet.local") ? user.email.split("@")[0] : "";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const eid = String(emailId || meta?.employee_id || "").trim();
  if (!eid) return null;
  const collector = COLLECTORS.find((c) => c.employeeId === eid);
  return {
    role: eid === ADMIN_EMPLOYEE_ID ? "admin" : "collector",
    employeeId: eid,
    name: eid === ADMIN_EMPLOYEE_ID ? "الإدارة" : collector?.collector || String(meta?.name || eid),
    supervisor: collector?.supervisor || String(meta?.supervisor || "") || undefined,
    loginAt: new Date().toISOString(),
  };
}

async function resolveSession(user: SupabaseUser): Promise<Session | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const profileSession = await loadProfile(user.id);
      if (profileSession) return profileSession;
    } catch (error) {
      lastError = error;
    }
    await wait(200);
  }
  const fallback = sessionFromAuthUser(user);
  if (fallback) return fallback;
  if (lastError) throw lastError;
  return null;
}

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supaSession, setSupaSession] = useState<SupabaseSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"collector" | "admin" | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let loadSeq = 0;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSupaSession(s);
      if (!s?.user) {
        loadSeq += 1;
        cachedSession = null;
        setSession(null);
        setHydrated(true);
        return;
      }
      // Defer async work to avoid Supabase listener deadlock
      const seq = ++loadSeq;
      setTimeout(() => {
        resolveSession(s.user)
          .then((p) => {
            if (!active || seq !== loadSeq) return;
            cachedSession = p;
            setSession(p);
          })
          .catch((err) => {
            if (!active || seq !== loadSeq) return;
            console.error("loadProfile failed", err);
            toast.error("تعذّر تحميل ملف المستخدم");
          })
          .finally(() => {
            if (active && seq === loadSeq) setHydrated(true);
          });
      }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSupaSession(data.session);
      if (!data.session?.user) {
        setHydrated(true);
        return;
      }
      const seq = ++loadSeq;
      resolveSession(data.session.user)
        .then((p) => {
          if (!active || seq !== loadSeq) return;
          cachedSession = p;
          setSession(p);
        })
        .catch((err) => console.error("loadProfile failed", err))
        .finally(() => {
          if (active && seq === loadSeq) setHydrated(true);
        });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!hydrated) return null;

  if (session) {
    return (
      <>
        <div className="fixed top-2 left-2 z-50 flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-3 py-1 text-xs shadow border">
          <span className="font-medium">
            {session.role === "admin" ? "إدارة" : "محصّل"} · {session.name || session.employeeId}
          </span>
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={clearSession}>
            <LogOut className="size-3" />
          </Button>
        </div>
        {children}
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    const eid = employeeId.trim();
    if (!eid) {
      toast.error("أدخل الرقم الوظيفي");
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        let name: string | undefined;
        let supervisor: string | undefined;
        if (role === "admin") {
          if (eid !== ADMIN_EMPLOYEE_ID) {
            toast.error("رقم وظيفي غير مصرّح للإدارة");
            return;
          }
          name = "الإدارة";
        } else {
          const found = COLLECTORS.find((c) => c.employeeId === eid);
          if (!found) {
            toast.error("الرقم الوظيفي غير موجود في قائمة المحصلين");
            return;
          }
          name = found.collector;
          supervisor = found.supervisor;
        }
        const { data, error } = await supabase.auth.signUp({
          email: synthEmail(eid),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { employee_id: eid, name, supervisor, role },
          },
        });
        if (error) throw error;
        if (data.session?.user) {
          const nextSession = await resolveSession(data.session.user);
          if (!nextSession) throw new Error("تعذّر تحميل ملف المستخدم");
          cachedSession = nextSession;
          setSupaSession(data.session);
          setSession(nextSession);
          toast.success("تم إنشاء الحساب وتم الدخول");
        } else {
          toast.success("تم إنشاء الحساب، سجّل الدخول للمتابعة");
          setMode("signin");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: synthEmail(eid),
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("invalid")) {
            toast.error("بيانات الدخول غير صحيحة. لأول مرة استخدم 'إنشاء حساب'");
          } else {
            toast.error(error.message);
          }
          return;
        }
        const signedInUser = data.user || data.session?.user;
        if (!signedInUser) throw new Error("تعذّر تأكيد جلسة الدخول");
        const nextSession = await resolveSession(signedInUser);
        if (!nextSession) throw new Error("تعذّر تحميل ملف المستخدم");
        cachedSession = nextSession;
        setSupaSession(data.session);
        setSession(nextSession);
        toast.success("تم الدخول");
      }
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">{mode === "signup" ? "إنشاء حساب" : "تسجيل الدخول"}</h1>
          <p className="text-xs text-muted-foreground">اختر طريقة الدخول للمتابعة</p>
        </div>

        {!role ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("collector")}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 hover:bg-accent transition"
            >
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UserCog className="size-6" />
              </div>
              <span className="text-sm font-medium">دخول كمحصّل</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 hover:bg-accent transition"
            >
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="size-6" />
              </div>
              <span className="text-sm font-medium">دخول كإدارة</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="text-center text-sm font-medium text-primary">
              {role === "admin" ? "حساب الإدارة" : "حساب المحصّل"}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">الرقم الوظيفي</label>
              <Input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="أدخل الرقم الوظيفي"
                inputMode="numeric"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">كلمة المرور</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setRole(null); setEmployeeId(""); setPassword(""); }}
                disabled={busy}
              >
                رجوع
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy ? "..." : mode === "signup" ? "إنشاء" : "دخول"}
              </Button>
            </div>
            <button
              type="button"
              className="w-full text-xs text-primary hover:underline pt-1"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "أول مرة؟ إنشاء حساب جديد" : "لدي حساب — تسجيل الدخول"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
