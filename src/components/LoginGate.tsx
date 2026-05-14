import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCog, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import collectors from "@/data/collectors.json";

const SESSION_KEY = "wallet:session:v1";
const PASSWORD = "123456";
const ADMIN_EMPLOYEE_ID = "972559";
const ADMIN_PASSWORD = "654321";

type Collector = { supervisor: string; collector: string; employeeId: string };
const COLLECTORS = collectors as Collector[];

export type Session = {
  role: "collector" | "admin";
  employeeId: string;
  name?: string;
  supervisor?: string;
  loginAt: string;
};

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(SESSION_KEY);
    return v ? (JSON.parse(v) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [role, setRole] = useState<"collector" | "admin" | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setSession(getSession());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (session) {
    return (
      <>
        <div className="fixed top-2 left-2 z-50 flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-3 py-1 text-xs shadow border">
          <span className="font-medium">
            {session.role === "admin" ? "إدارة" : "محصّل"} · {session.name || session.employeeId}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => {
              clearSession();
            }}
          >
            <LogOut className="size-3" />
          </Button>
        </div>
        {children}
      </>
    );
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    if (!employeeId.trim()) {
      toast.error("أدخل الرقم الوظيفي");
      return;
    }
    const eid = employeeId.trim();
    let name: string | undefined;
    let supervisor: string | undefined;
    if (role === "admin") {
      if (eid !== ADMIN_EMPLOYEE_ID || password !== ADMIN_PASSWORD) {
        toast.error("بيانات دخول الإدارة غير صحيحة");
        return;
      }
    } else {
      if (password !== PASSWORD) {
        toast.error("كلمة المرور غير صحيحة");
        return;
      }
      const found = COLLECTORS.find((c) => c.employeeId === eid);
      if (!found) {
        toast.error("الرقم الوظيفي غير موجود في قائمة المحصلين");
        return;
      }
      name = found.collector;
      supervisor = found.supervisor;
    }
    const s: Session = {
      role,
      employeeId: eid,
      name,
      supervisor,
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
    toast.success(`مرحباً ${name || (role === "admin" ? "بالإدارة" : "بالمحصّل")}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">تسجيل الدخول</h1>
          <p className="text-xs text-muted-foreground">اختر طريقة الدخول للمتابعة</p>
        </div>

        {!role ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRole("collector")}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 hover:bg-accent transition"
            >
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UserCog className="size-6" />
              </div>
              <span className="text-sm font-medium">دخول كمحصّل</span>
            </button>
            <button
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
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="text-center text-sm font-medium text-primary">
              {role === "admin" ? "دخول الإدارة" : "دخول المحصّل"}
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
                placeholder="••••••"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setRole(null); setEmployeeId(""); setPassword(""); }}>
                رجوع
              </Button>
              <Button type="submit" className="flex-1">
                دخول
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
