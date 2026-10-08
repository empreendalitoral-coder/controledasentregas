import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadFinanceiroUnificado } from "./financeiro-aggregate";
import { fiscalLabels, type FiscalClass, type FiscalRow } from "./fiscal";

export const fiscalQuery = (year: number) => queryOptions({
  queryKey: ["fiscal", year],
  queryFn: async (): Promise<FiscalRow[]> => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error("Entre na sua conta para consultar os registros.");
    const [rows, annotations] = await Promise.all([
      loadFinanceiroUnificado({ start: `${year}-01-01`, end: `${year}-12-31` }),
      supabase.from("fiscal_classifications").select("movement_id,classification").eq("user_id", auth.user.id),
    ]);
    if (annotations.error) throw annotations.error;
    const map = new Map(annotations.data.map((item) => [item.movement_id, item.classification]));
    return rows.map((row) => {
      const saved = map.get(row.id);
      const classification: FiscalClass = saved && saved in fiscalLabels ? saved as FiscalClass : "nao_classificado";
      return { ...row, classification };
    });
  },
});

export async function saveFiscalClass(movementId: string, classification: FiscalClass) {
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!data.user) throw new Error("Entre na sua conta para salvar.");
  const uid = data.user.id;
  const result = classification === "nao_classificado"
    ? await supabase.from("fiscal_classifications").delete().eq("user_id", uid).eq("movement_id", movementId)
    : await supabase.from("fiscal_classifications").upsert({ user_id: uid, movement_id: movementId, classification, updated_at: new Date().toISOString() }, { onConflict: "user_id,movement_id" });
  if (result.error) throw result.error;
}