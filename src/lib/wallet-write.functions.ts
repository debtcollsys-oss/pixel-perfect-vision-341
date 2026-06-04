import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_EMPLOYEE_ID = "666666";

const RowSchema = z.object({
  customer_key: z.string(),
  account_number: z.string().nullable().optional(),
  national_id: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  product: z.string().nullable().optional(),
  debt_age: z.any().optional(),
  action: z.string().nullable().optional(),
  installment: z.string().nullable().optional(),
  is_salary: z.boolean().optional(),
  is_deceased: z.boolean().optional(),
  agent_employee_id: z.string().nullable().optional(),
  raw: z.any().optional(),
  imported_by: z.string().nullable().optional(),
  file_month: z.string().nullable().optional(),
});

const ClearInput = z.object({ employeeId: z.string() });

export const clearWalletCustomers = createServerFn({ method: "POST" })
  .inputValidator((input) => ClearInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("customers")
      .delete()
      .not("id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AppendInput = z.object({
  employeeId: z.string(),
  rows: z.array(RowSchema).max(2000),
});

export const appendWalletCustomers = createServerFn({ method: "POST" })
  .inputValidator((input) => AppendInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const CHUNK = 500;
    for (let i = 0; i < data.rows.length; i += CHUNK) {
      const slice = data.rows.slice(i, i + CHUNK);
      const { error } = await supabaseAdmin.from("customers").insert(slice as any);
      if (error) throw new Error(error.message);
    }
    return { inserted: data.rows.length };
  });

// Backwards-compat: keep replaceWalletCustomers but enforce small batches.
// For full replace, callers should use clearWalletCustomers + appendWalletCustomers in chunks.
const ReplaceInput = z.object({
  employeeId: z.string(),
  rows: z.array(RowSchema).max(2000),
});

export const replaceWalletCustomers = createServerFn({ method: "POST" })
  .inputValidator((input) => ReplaceInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin
      .from("customers")
      .delete()
      .not("id", "is", null);
    if (delErr) throw new Error(delErr.message);
    const CHUNK = 500;
    for (let i = 0; i < data.rows.length; i += CHUNK) {
      const slice = data.rows.slice(i, i + CHUNK);
      const { error } = await supabaseAdmin.from("customers").insert(slice as any);
      if (error) throw new Error(error.message);
    }
    return { inserted: data.rows.length };
  });

const PatchSchema = z.object({
  agent_employee_id: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  action: z.string().nullable().optional(),
});

const UpdateInput = z.object({
  employeeId: z.string(),
  matches: z.array(z.object({
    account_number: z.string().nullable().optional(),
    national_id: z.string().nullable().optional(),
    patch: PatchSchema,
  })).max(2000),
});

export const updateWalletCustomers = createServerFn({ method: "POST" })
  .inputValidator((input) => UpdateInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let affected = 0;
    for (const m of data.matches) {
      if (Object.keys(m.patch).length === 0) continue;
      let q = supabaseAdmin.from("customers").update(m.patch);
      if (m.account_number) q = q.eq("account_number", m.account_number);
      else if (m.national_id) q = q.eq("national_id", m.national_id);
      else continue;
      const { error } = await q;
      if (!error) affected++;
    }
    return { affected };
  });

const DeleteInput = z.object({
  employeeId: z.string(),
  matches: z.array(z.object({
    account_number: z.string().nullable().optional(),
    national_id: z.string().nullable().optional(),
  })).max(2000),
});

export const deleteWalletCustomers = createServerFn({ method: "POST" })
  .inputValidator((input) => DeleteInput.parse(input))
  .handler(async ({ data }) => {
    if (data.employeeId !== ADMIN_EMPLOYEE_ID) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let affected = 0;
    for (const m of data.matches) {
      let q = supabaseAdmin.from("customers").delete();
      if (m.account_number) q = q.eq("account_number", m.account_number);
      else if (m.national_id) q = q.eq("national_id", m.national_id);
      else continue;
      const { error } = await q;
      if (!error) affected++;
    }
    return { affected };
  });
