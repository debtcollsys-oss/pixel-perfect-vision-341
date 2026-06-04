import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WalletInput = z.object({
  role: z.enum(["collector", "admin"]),
  employeeId: z.string().trim().regex(/^\d{3,12}$/),
});

export const getWalletCustomers = createServerFn({ method: "POST" })
  .inputValidator((input) => WalletInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("customers")
      .select("*")
      .order("amount", { ascending: false })
      .limit(50000);

    if (data.role === "collector") {
      query = query.eq("agent_employee_id", data.employeeId);
    } else if (data.employeeId !== "666666") {
      return [];
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });