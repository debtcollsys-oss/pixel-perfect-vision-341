import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, Mail, IdCard, Users, LogOut } from "lucide-react";
import { getSession, clearSession } from "@/components/LoginGate";
import { useWallet } from "@/lib/wallet-store";
import { useMemo } from "react";

export default function CollectorInfoCard() {
  const session = getSession();
  const { customers } = useWallet();

  const supervisor = useMemo(() => {
    if (session?.supervisor) return session.supervisor;
    const fromWallet = customers.find((c: any) => c["المشرف"] || c["supervisor"]);
    if (fromWallet) return (fromWallet as any)["المشرف"] || (fromWallet as any)["supervisor"];
    return "غير محدد";
  }, [session, customers]);

  if (!session || session.role !== "collector") return null;

  const email = `${session.employeeId}@alahli.com`;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <UserCircle className="size-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">بيانات المحصل</div>
          <div className="text-base font-bold truncate">{session.name || session.employeeId}</div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={clearSession}
          aria-label="خروج"
          title="خروج"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs">
        <InfoRow icon={<IdCard className="size-4" />} label="الرقم الوظيفي" value={session.employeeId} />
        <InfoRow icon={<Mail className="size-4" />} label="البريد الإلكتروني" value={email} mono ltr />
        <InfoRow icon={<Users className="size-4" />} label="اسم المشرف" value={supervisor} />
      </div>
    </Card>
  );
}

function InfoRow({ icon, label, value, mono, ltr }: { icon: React.ReactNode; label: string; value: string; mono?: boolean; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="text-muted-foreground shrink-0">{label}:</div>
      <div
        className={`flex-1 font-medium truncate ${mono ? "tabular-nums" : ""} ${ltr ? "text-right" : "text-right"}`}
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </div>
    </div>
  );
}
