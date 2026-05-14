import { Card } from "@/components/ui/card";
import {
  HandCoins,
  FileMinus,
  CalendarClock,
  Wallet,
  Mail,
  Users2,
  Lock,
} from "lucide-react";

export type QuickKey =
  | "promises"
  | "exemptions"
  | "reschedules"
  | "wallet"
  | "mail"
  | "group";

const ITEMS: { key: QuickKey; label: string; icon: any }[] = [
  { key: "promises", label: "وعود السداد", icon: HandCoins },
  { key: "exemptions", label: "طلبات الإعفاء", icon: FileMinus },
  { key: "reschedules", label: "طلبات الجدولة", icon: CalendarClock },
  { key: "wallet", label: "المحفظة كاملة", icon: Wallet },
  { key: "mail", label: "البريد الخاص", icon: Mail },
  { key: "group", label: "القروب", icon: Users2 },
];

export function QuickActionsSlider({
  onSelect,
  groupEnabled = false,
  mailBadge,
}: {
  onSelect?: (key: QuickKey) => void;
  groupEnabled?: boolean;
  mailBadge?: number;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
      <div className="aspect-[16/9] w-full p-5 grid grid-cols-3 grid-rows-2 gap-3">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const disabled = key === "group" && !groupEnabled;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(key)}
              className={`relative rounded-2xl bg-primary-foreground/15 hover:bg-primary-foreground/25 active:scale-[0.97] transition flex flex-col items-center justify-center gap-2 p-2 text-center ${
                disabled ? "opacity-40 cursor-not-allowed grayscale" : ""
              }`}
            >
              {disabled ? (
                <Lock className="size-4 opacity-90" />
              ) : (
                <Icon className="size-4 opacity-90" />
              )}
              <span className="text-[10px] font-bold leading-tight whitespace-nowrap">
                {label}
              </span>
              {key === "mail" && mailBadge && mailBadge > 0 ? (
                <span className="absolute top-1 left-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {mailBadge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
