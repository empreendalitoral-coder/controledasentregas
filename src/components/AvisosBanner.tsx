import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";

type Aviso = { id: string; titulo: string; mensagem: string; created_at: string };

export function AvisosBanner() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: todos }, { data: lidos }] = await Promise.all([
        supabase
          .from("avisos")
          .select("id, titulo, mensagem, created_at")
          .eq("ativo", true)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("avisos_lidos").select("aviso_id").eq("user_id", u.user.id),
      ]);
      if (cancelado) return;
      const lidosSet = new Set((lidos ?? []).map((l) => l.aviso_id as string));
      setAvisos(((todos ?? []) as Aviso[]).filter((a) => !lidosSet.has(a.id)));
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const aviso = avisos[0];
  if (!aviso || fechado) return null;

  async function marcarLido() {
    setFechado(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !aviso) return;
    await supabase
      .from("avisos_lidos")
      .upsert({ aviso_id: aviso.id, user_id: u.user.id });
    setAvisos((prev) => prev.slice(1));
    setFechado(false);
  }

  return (
    <div className="ep-card mb-4 flex items-start gap-3 border-primary/30">
      <div className="size-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Megaphone className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{aviso.titulo}</div>
        <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
          {aviso.mensagem}
        </div>
        <button
          type="button"
          onClick={marcarLido}
          className="mt-2 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
        >
          Entendi
        </button>
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => setFechado(true)}
        className="text-muted-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
