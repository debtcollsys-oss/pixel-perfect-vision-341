import { createFileRoute } from "@tanstack/react-router";
import DiscountCalculator from "@/components/DiscountCalculator";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "حاسبة الخصم — سياسة التسوية الشهرية" },
      { name: "description", content: "حاسبة خصم احترافية لمنتجات PF و CC و AL مع لوحة إدارة سياسة الخصم الشهرية." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <DiscountCalculator />
      <Toaster position="top-center" richColors />
    </>
  );
}
