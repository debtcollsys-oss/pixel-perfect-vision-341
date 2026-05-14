import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { User, IdCard, Clock, Target, Users, Wallet } from "lucide-react";

const COLLECTOR_NAME = "ماجد عامر السفياني";
const EMPLOYEE_ID = "972559";
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
  const remaining = Math.max(0, TARGET - collected);

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
      <div className="aspect-square w-full p-5 flex flex-col justify-between gap-3">
        {/* Collector */}
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-full bg-primary-foreground/15 grid place-items-center shrink-0">
            <User className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold leading-tight truncate">{COLLECTOR_NAME}</div>
            <div className="flex items-center gap-1 text-[11px] opacity-85 mt-0.5">
              <IdCard className="size-3.5" />
              <span className="tabular-nums">{EMPLOYEE_ID}</span>
            </div>
          </div>
          <div className="text-left text-[10px] leading-tight opacity-90 shrink-0">
            <div className="font-bold text-[11px]">
              {now.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long" })}
            </div>
            <div className="tabular-nums mt-0.5">
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

        {/* Achievement */}
        <div>
          <div className="flex items-center justify-between text-[11px] opacity-85 mb-1">
            <div className="flex items-center gap-1.5">
              <Target className="size-3.5" />
              <span>مؤشر التحقيق</span>
            </div>
            <span className="tabular-nums">{pct.toFixed(1)}%</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-extrabold tabular-nums leading-none">
              {formatSAR(collected)}
            </div>
            <div className="text-[10px] opacity-80">من {formatSAR(TARGET)}</div>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-primary-foreground/20 overflow-hidden">
            <div
              className="h-full bg-primary-foreground transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] opacity-80 text-left mt-1">
            المتبقي: {formatSAR(remaining)}
          </div>
        </div>
      </div>
    </Card>
  );
}
