import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { validarDespesaNota, type LeituraNota } from "./notas";
export type DespesaNota = Database["public"]["Tables"]["despesas_notas"]["Row"];
export const notasQuery = queryOptions({ queryKey: ["despesas-notas"], queryFn: async () => {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Entre novamente para acessar suas despesas.");
  const rows: DespesaNota[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("despesas_notas").select("*").eq("user_id", auth.user.id).order("data", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
} });
export async function salvarNota(values: LeituraNota, id?: string) {
  validarDespesaNota(values);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Entre novamente para salvar.");
  const query = id ? supabase.from("despesas_notas").update(values).eq("id", id).eq("user_id", auth.user.id) : supabase.from("despesas_notas").insert({ ...values, user_id: auth.user.id });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}
export async function excluirNota(id: string) {
  const { error } = await supabase.from("despesas_notas").delete().eq("id", id).select("id").single();
  if (error) throw error;
}