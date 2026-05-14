import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import WalletApp from "@/components/WalletApp";
import AdminDashboard from "@/components/AdminDashboard";
import LoginGate, { getSession, type Session } from "@/components/LoginGate";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "إدارة محفظة العملاء — مايو 2026" },
      { name: "description", content: "تطبيق لإدارة محفظة العملاء والتواصل معهم عبر الاتصال والواتساب." },
    ],
  }),
  component: Index,
});

function RoleSwitch() {
  const [session, setSession] = useState<Session | null>(getSession());
  useEffect(() => {
    const tick = () => setSession(getSession());
    tick();
    const id = setInterval(tick, 300);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => tick());
    return () => {
      clearInterval(id);
      subscription.unsubscribe();
    };
  }, []);
  if (session?.role === "admin") return <AdminDashboard />;
  return <WalletApp />;
}

function Index() {
  return (
    <>
      <LoginGate>
        <RoleSwitch />
      </LoginGate>
      <Toaster position="top-center" richColors />
    </>
  );
}
