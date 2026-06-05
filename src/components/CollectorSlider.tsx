import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Clock, Target, Users, Wallet } from "lucide-react";

const TARGET = 350000;

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function formatSAR(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function CollectorSlider({
  collected,
  accountsCount,
  walletTotal,
}: {
  collected: number;
  accountsCount: number;
  walletTotal: number;
}) {
  const now = useNow();
  const eom = endOfMonth(now);
  const diff = Math.max(0, eom.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  const pct = Math.min(100, (collected / TARGET) * 100);

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
      <div className="aspect-square w-full p-5 flex flex-col justify-between gap-3">
        {/* Date */}
        <div className="flex items-center justify-between gap-2 text-[11px] opacity-90">
          <div className="font-bold text-sm">
            {now.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long" })}
          </div>
          <div className="text-left leading-tight">
            <div className="tabular-nums">
              {now.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <div className="tabular-nums opacity-80">
              {now.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Accounts + Wallet */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-primary-foreground/15 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] opacity-85">
              <Users className="size-3.5" />
              <span>عدد الحسابات</span>
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums leading-none">
              {accountsCount.toLocaleString("en-US")}
            </div>
          </div>
          <div className="rounded-xl bg-primary-foreground/15 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] opacity-85">
              <Wallet className="size-3.5" />
              <span>رصيد المحفظة</span>
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums leading-none truncate">
              {formatSAR(walletTotal)}
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] opacity-85 mb-1.5">
            <Clock className="size-3.5" />
            <span>المتبقي على نهاية الشهر</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { v: days, l: "يوم" },
              { v: hours, l: "ساعة" },
              { v: mins, l: "دقيقة" },
              { v: secs, l: "ثانية" },
            ].map((it) => (
              <div key={it.l} className="rounded-md bg-primary-foreground/15 py-1.5">
                <div className="text-lg font-bold tabular-nums leading-none">
                  {String(it.v).padStart(2, "0")}
                </div>
                <div className="text-[9px] opacity-80 mt-0.5">{it.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievement - interactive gradient indicator */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] opacity-85 mb-2">
            <Target className="size-3.5" />
            <span>مؤشر التحقيق</span>
          </div>
          <AchievementMeter pct={pct} />
          <div className="flex items-center justify-between mt-2 text-[11px] tabular-nums" dir="ltr">
            <span className="font-bold">{formatSAR(collected)} SAR</span>
            <span className="font-bold opacity-90">{formatSAR(TARGET)} SAR</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

const MILESTONES = [
  { at: 60, label: "2%" },
  { at: 70, label: "2.5%" },
  { at: 85, label: "3%" },
  { at: 100, label: "3.5%" },
];

function AchievementMeter({ pct }: { pct: number }) {
  return (
    <div className="relative w-full" dir="ltr">
      <div className="relative h-3 w-full rounded-full overflow-hidden bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(90deg,#7f1d1d,#9a3412,#a16207,#3f6212,#14532d)",
          }}
        />
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-700"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg,#ef4444,#f97316,#eab308,#84cc16,#22c55e)",
          }}
        />
        <div
          className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none mix-blend-overlay"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)",
            animation: "meterShimmer 2.4s linear infinite",
          }}
        />
      </div>

      <div className="relative h-8 mt-1">
        {MILESTONES.map((m) => {
          const reached = pct >= m.at;
          return (
            <div
              key={m.at}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${m.at}%` }}
            >
              <div
                className={`w-px h-2 transition-all ${reached ? "bg-emerald-300" : "bg-transparent"}`}
                style={reached ? { boxShadow: "0 0 6px #6ee7b7" } : undefined}
              />
              <div
                className={`mt-0.5 size-1.5 rounded-full transition-all duration-500 ${reached ? "bg-emerald-300 scale-100 opacity-100 animate-pulse" : "scale-0 opacity-0"}`}
                style={reached ? { boxShadow: "0 0 8px #6ee7b7, 0 0 14px #34d399" } : undefined}
              />
              <div
                className={`mt-0.5 text-[9px] font-bold tabular-nums text-emerald-300 transition-all duration-500 ${reached ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}
                style={reached ? { textShadow: "0 0 6px rgba(110,231,183,0.8)" } : undefined}
              >
                {m.label}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes meterShimmer {
          0% { transform: translateX(0%); }
          100% { transform: translateX(450%); }
        }
      `}</style>
    </div>
  );
}
