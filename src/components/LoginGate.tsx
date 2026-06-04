import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ShieldCheck,
  BarChart3,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import collectors from "@/data/collectors.json";
import heroMain from "@/assets/hero-main.png";
import slide1 from "@/assets/slide-1.png";
import slide2 from "@/assets/slide-2.png";
import slide3 from "@/assets/slide-3.png";
import slide4 from "@/assets/slide-4.png";
import slide5 from "@/assets/slide-5.png";

const ADMIN_USERNAME = "666666";
const ADMIN_PASSWORD = "123456";
const COLLECTOR_PASSWORD = "123456";
const STORAGE_KEY = "wallet:session";

type Collector = { supervisor: string; collector: string; employeeId: string };
const COLLECTORS = collectors as Collector[];

export type Session = {
  role: "collector" | "admin";
  employeeId: string;
  name?: string;
  supervisor?: string;
  loginAt: string;
};

let cachedSession: Session | null = null;
const listeners = new Set<() => void>();

function readStored(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (!cachedSession) cachedSession = readStored();
  return cachedSession;
}

function setSessionState(s: Session | null) {
  cachedSession = s;
  if (typeof window !== "undefined") {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((l) => l());
}

export function clearSession() {
  setSessionState(null);
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [role, setRole] = useState<"collector" | "admin">("collector");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const now = useNow();

  useEffect(() => {
    const cb = () => setSession(getSession());
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  if (session) {
    return <>{children}</>;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eid = employeeId.trim();
    if (!eid) { toast.error("أدخل الرقم الوظيفي"); return; }
    if (!password) { toast.error("أدخل كلمة المرور"); return; }
    setBusy(true);
    try {
      if (role === "admin") {
        if (eid === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          setSessionState({
            role: "admin",
            employeeId: eid,
            name: "الإدارة",
            loginAt: new Date().toISOString(),
          });
          toast.success("تم الدخول كإدارة");
          return;
        }
        toast.error("بيانات الإدارة غير صحيحة");
        return;
      }
      if (password !== COLLECTOR_PASSWORD) {
        toast.error("كلمة المرور غير صحيحة");
        return;
      }
      const found = COLLECTORS.find((c) => c.employeeId === eid);
      setSessionState({
        role: "collector",
        employeeId: eid,
        name: found?.collector || eid,
        supervisor: found?.supervisor,
        loginAt: new Date().toISOString(),
      });
      toast.success("تم الدخول");
    } finally {
      setBusy(false);
    }
  }

  const openLogin = () => {
    setRole("collector");
    setEmployeeId("");
    setPassword("");
    setLoginOpen(true);
  };

  const time = now ? now.toLocaleTimeString("en-GB", { hour12: false }) : "";
  const date = now ? now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0f2622]" dir="rtl">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#13312c] via-[#0f2622] to-[#081a17]" />

      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <BarChart3 className="size-4 text-emerald-400" />
            <span className="font-bold text-sm">التحصيل الذكي</span>
          </div>
          <div className="text-white text-left leading-tight">
            <div className="font-mono font-bold text-xs tabular-nums tracking-wider text-emerald-300">
              {time}
            </div>
            <div className="text-[9px] opacity-70 tabular-nums">{date}</div>
          </div>
        </div>
      </header>

      <section className="relative flex flex-col items-stretch px-4 pt-6 pb-8 text-white">
        <div className="w-full max-w-md mx-auto">
          <FeatureSlider />
        </div>

        <Button
          onClick={openLogin}
          size="lg"
          className="mt-8 mx-auto bg-emerald-500/70 hover:bg-emerald-500 text-white rounded-2xl px-16 h-14 gap-3 shadow-lg font-bold text-base w-[88%] max-w-md"
        >
          <LogIn className="size-5" />
          تسجيل الدخول
        </Button>
      </section>


      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent
          className="max-w-[300px] p-4 gap-2 bg-black/40 backdrop-blur-xl border-white/15 text-white shadow-2xl"
          dir="rtl"
        >
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-center text-sm text-white">
              {role === "admin" ? "دخول الإدارة" : "تسجيل دخول المحصّل"}
            </DialogTitle>
            <DialogDescription className="text-center text-[10px] text-white/60">
              أدخل بياناتك للمتابعة
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-2 pt-1">
            <Input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              inputMode="numeric"
              autoFocus
              className="h-9 bg-white/10 border-white/15 text-white placeholder:text-white/40"
            />
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              className="h-9 bg-white/10 border-white/15 text-white placeholder:text-white/40"
            />
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={busy}
                className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {busy ? "..." : "دخول"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRole((r) => (r === "admin" ? "collector" : "admin"));
                  setEmployeeId("");
                  setPassword("");
                }}
                className="h-9 px-2 text-[10px] text-white/80 hover:text-white hover:bg-white/10 gap-1"
                title="دخول الإدارة"
              >
                <ShieldCheck className="size-3.5" />
                {role === "admin" ? "محصّل" : "إدارة"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const SLIDES: string[] = [slide1, slide2, slide3, slide4, slide5];

function FeatureSlider() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % SLIDES.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 bg-emerald-500/10 blur-3xl rounded-[2rem]" />
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl ring-1 ring-emerald-400/20"
        style={{ aspectRatio: "16 / 9" }}
        dir="ltr"
      >
        {SLIDES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`شريحة ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-in-out will-change-transform"
            style={{
              transform: `translateX(${(i - idx) * 100}%)`,
            }}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`الشريحة ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === idx ? "w-8 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : "w-1.5 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

