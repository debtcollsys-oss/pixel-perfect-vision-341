import { useEffect, useRef, useState } from "react";
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
      <div className="aspect-square w-full p-5 flex flex-col justify-between gap-1.5">
        {/* Accounts + Wallet */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-primary-foreground/15 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 text-[10px] opacity-85">
              <Users className="size-3" />
              <span>عدد الحسابات</span>
            </div>
            <div className="mt-0.5 text-base font-bold tabular-nums leading-none">
              {accountsCount.toLocaleString("en-US")}
            </div>
          </div>
          <div className="rounded-xl bg-primary-foreground/15 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 text-[10px] opacity-85">
              <Wallet className="size-3" />
              <span>رصيد المحفظة</span>
            </div>
            <div className="mt-0.5 text-base font-bold tabular-nums leading-none truncate">
              {formatSAR(walletTotal)}
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] opacity-85 mb-1">
            <Clock className="size-3" />
            <span>المتبقي على نهاية الشهر</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { v: days, l: "يوم" },
              { v: hours, l: "ساعة" },
              { v: mins, l: "دقيقة" },
              { v: secs, l: "ثانية" },
            ].map((it) => (
              <div key={it.l} className="rounded-md bg-primary-foreground/15 py-1">
                <div className="text-base font-bold tabular-nums leading-none">
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
            <span>مؤشر التحقيق التفاعلي</span>
          </div>
          <AchievementMeter pct={pct} realPct={pct} />
          <div className="flex items-center justify-between mt-2 text-[11px] tabular-nums" dir="ltr">
            <span className="font-bold">{formatSAR(collected)} SAR</span>
            <span className="font-bold opacity-90">{formatSAR(TARGET)} SAR</span>
          </div>
        </div>

        {/* Achievement - real static indicator */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] opacity-85 mb-2">
            <Target className="size-3.5" />
            <span>مؤشر التحقيق الفعلي</span>
          </div>
          <AchievementMeter pct={pct} realPct={pct} staticMode />
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
  { at: 60, label: "2%", pctLabel: "2%", text: "إنسنتفك ≈ تقريباً [ 4,200 - 4,830 ] SAR", color: "#eab308" },
  { at: 70, label: "2.5%", pctLabel: "2.5%", text: "إنسنتفك ≈ تقريباً [ 6,125 - 7,350 ] SAR", color: "#a3b510" },
  { at: 85, label: "3%", pctLabel: "3%", text: "إنسنتفك ≈ تقريباً [ 8,925 - 10,395 ] SAR", color: "#84cc16" },
  { at: 100, label: "3.5%", pctLabel: "3.5%", text: "إنسنتفك ≈ تقريباً [ 12,250 - ∞ ] SAR", color: "#22c55e" },
];

function AchievementMeter({ realPct, staticMode }: { pct: number; realPct: number; staticMode?: boolean }) {
  const [animPct, setAnimPct] = useState(0);
  const [bursts, setBursts] = useState<Record<number, number>>({});
  const [showReal, setShowReal] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pauseElapsed, setPauseElapsed] = useState(0);
  const lastBurstRef = useRef<number | null>(null);

  useEffect(() => {
    if (showReal || staticMode) return;

    const pauseMs = 4000;
    const segments = [
      { from: 0, to: 60, dur: 6000, pauseAfter: pauseMs },
      { from: 60, to: 70, dur: 2500, pauseAfter: pauseMs },
      { from: 70, to: 85, dur: 3000, pauseAfter: pauseMs },
      { from: 85, to: 100, dur: 3000, pauseAfter: pauseMs },
    ];
    const cycleMs = segments.reduce((s, x) => s + x.dur + x.pauseAfter, 0);

    let raf = 0;
    let cancelled = false;
    let startTs = 0;

    const ease = (k: number) =>
      k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

    const tick = (t: number) => {
      if (cancelled) return;
      if (!startTs) startTs = t;
      const total = (t - startTs) % cycleMs;
      if (total < 50) lastBurstRef.current = null;

      let elapsed = total;
      let nextPct = 0;
      let currentPause: number | null = null;
      let currentPauseElapsed = 0;
      for (const seg of segments) {
        if (elapsed < seg.dur) {
          const k = elapsed / seg.dur;
          nextPct = seg.from + (seg.to - seg.from) * ease(k);
          break;
        }
        elapsed -= seg.dur;
        if (elapsed < seg.pauseAfter) {
          nextPct = seg.to;
          currentPause = seg.to;
          currentPauseElapsed = elapsed;
          break;
        }
        elapsed -= seg.pauseAfter;
      }

      setAnimPct(nextPct);
      setPausedAt(currentPause);
      setPauseElapsed(currentPauseElapsed);

      for (const milestone of MILESTONES) {
        if (
          nextPct >= milestone.at &&
          (lastBurstRef.current === null || milestone.at > lastBurstRef.current)
        ) {
          lastBurstRef.current = milestone.at;
          setBursts((b) => ({ ...b, [milestone.at]: Date.now() }));
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [showReal]);

  const displayPct = showReal || staticMode ? realPct : animPct;
  const pausedMilestone = !showReal && pausedAt !== null
    ? MILESTONES.find((m) => m.at === pausedAt)
    : null;

  // Pause phases: 0-700ms = fireworks, 700-1400ms = color fill transition, 1400ms+ = message
  const FIREWORKS_MS = 700;
  const COLOR_FILL_MS = 700;
  const showFireworks = !!pausedMilestone && pauseElapsed < FIREWORKS_MS;
  const colorFillT = pausedMilestone
    ? Math.min(1, Math.max(0, (pauseElapsed - FIREWORKS_MS) / COLOR_FILL_MS))
    : 0;
  const showMessage = !!pausedMilestone && pauseElapsed >= FIREWORKS_MS + COLOR_FILL_MS;

  const barBackground = pausedMilestone
    ? colorFillT >= 1
      ? pausedMilestone.color
      : `linear-gradient(90deg, #ef4444, #f97316, #eab308, #84cc16, #22c55e), ${pausedMilestone.color}`
    : "linear-gradient(90deg,#ef4444,#f97316,#eab308,#84cc16,#22c55e)";





  return (
    <div
      className="relative w-full select-none"
      dir="ltr"
      onMouseEnter={() => setShowReal(true)}
      onMouseLeave={() => setShowReal(false)}
      onTouchStart={() => setShowReal(true)}
      onTouchEnd={() => setShowReal(false)}
      onTouchCancel={() => setShowReal(false)}
    >
      <div className="relative h-6 w-full rounded-full overflow-hidden bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "linear-gradient(90deg,#7f1d1d,#9a3412,#a16207,#3f6212,#14532d)",
          }}
        />
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${displayPct}%`,
            background:
              "linear-gradient(90deg,#ef4444,#f97316,#eab308,#84cc16,#22c55e)",
            boxShadow: "0 0 12px rgba(34,197,94,0.4)",
          }}
        />
        {pausedMilestone && (
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${displayPct}%`,
              background: pausedMilestone.color,
              opacity: colorFillT,
              boxShadow: `0 0 16px ${pausedMilestone.color}`,
            }}
          />
        )}
        <div
          className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none mix-blend-overlay"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)",
            animation: "meterShimmer 2.2s linear infinite",
          }}
        />
        {showFireworks && pausedMilestone && (
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${pausedMilestone.at}%` }}
          >
            <BigFireworks color={pausedMilestone.color} />
          </div>
        )}
        {/* Inside-bar tick marks 0%..100% */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 11 }, (_, i) => i * 10).map((p) => {
            const reached = displayPct >= p;
            return (
              <div
                key={p}
                className="absolute top-0 bottom-0 flex flex-col items-center justify-between py-0.5"
                style={{ left: `${p}%`, transform: "translateX(-50%)" }}
              >
                <div
                  className={`w-px h-1.5 ${reached ? "bg-white/90" : "bg-white/40"}`}
                />
                <div
                  className={`text-[7px] font-bold tabular-nums leading-none ${reached ? "text-white" : "text-white/60"}`}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
                >
                  {p}
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {pausedMilestone && showMessage ? (
            <span
              dir="rtl"
              className="flex items-center gap-1 text-[11px] font-extrabold tabular-nums text-white"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
            >
              <span>إنسنتفك</span>
              <span
                className="text-[15px] font-black"
                style={{ color: pausedMilestone.color, textShadow: `0 0 8px ${pausedMilestone.color}` }}
              >
                {pausedMilestone.pctLabel}
              </span>
              <span>{pausedMilestone.text.replace("إنسنتفك ", "")}</span>
            </span>
          ) : (
            <span
              dir="rtl"
              className="text-[11px] font-extrabold tabular-nums text-white"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
            >
              {pausedMilestone
                ? ""
                : `${displayPct.toFixed(1)}%${showReal ? " (فعلي)" : ""}`}
            </span>
          )}
        </div>
        {/* Confetti bursts at milestones */}
        {MILESTONES.map((m) => {
          const burst = bursts[m.at];
          if (!burst) return null;
          return (
            <div
              key={m.at}
              className="absolute top-0 -translate-x-1/2 pointer-events-none"
              style={{ left: `${m.at}%` }}
            >
              <Confetti key={burst} />
            </div>
          );
        })}
      </div>


      <style>{`
        @keyframes meterShimmer {
          0% { transform: translateX(0%); }
          100% { transform: translateX(450%); }
        }
        @keyframes sparkFly {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function Confetti() {
  const sparks = Array.from({ length: 10 });
  const colors = ["#fde68a", "#6ee7b7", "#fca5a5", "#93c5fd", "#fcd34d"];
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none">
      {sparks.map((_, i) => {
        const angle = (Math.PI * (i / sparks.length)) - Math.PI / 2;
        const dist = 18 + Math.random() * 14;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 4;
        return (
          <span
            key={i}
            className="absolute block w-1 h-1 rounded-full"
            style={{
              background: colors[i % colors.length],
              boxShadow: `0 0 6px ${colors[i % colors.length]}`,
              ["--dx" as any]: `${dx}px`,
              ["--dy" as any]: `${dy}px`,
              animation: "sparkFly 900ms ease-out forwards",
            }}
          />
        );
      })}
    </div>
  );
}

function BigFireworks({ color }: { color: string }) {
  const sparks = Array.from({ length: 22 });
  const palette = ["#fde68a", "#fff7ed", "#fca5a5", "#93c5fd", "#fcd34d", color];
  return (
    <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {sparks.map((_, i) => {
        const angle = (Math.PI * 2 * i) / sparks.length;
        const dist = 22 + Math.random() * 22;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const c = palette[i % palette.length];
        return (
          <span
            key={i}
            className="absolute block w-1.5 h-1.5 rounded-full"
            style={{
              background: c,
              boxShadow: `0 0 10px ${c}, 0 0 16px ${c}`,
              ["--dx" as any]: `${dx}px`,
              ["--dy" as any]: `${dy}px`,
              animation: "sparkFly 700ms ease-out forwards",
            }}
          />
        );
      })}
    </div>
  );
}


