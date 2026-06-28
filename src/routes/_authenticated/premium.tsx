import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePremium } from "@/lib/premium";
import { Crown, Copy, Upload, Check, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

type Config = {
  nome_recebedor: string;
  chave_pix: string;
  tipo_chave_pix: string;
  valor_mensal: number;
  valor_anual: number;
  dias_teste_gratis: number;
  mensagem_pagamento: string;
};

type Solic = {
  id: string;
  plano: "mensal" | "anual" | "teste";
  valor: number;
  status: "pendente" | "aprovado" | "recusado";
  created_at: string;
  observacao_admin: string | null;
};

export const Route = createFileRoute("/_authenticated/premium")({
  head: () => ({ meta: [{ title: "Premium — Entrega Pro" }] }),
  component: PremiumPage,
});

function PremiumPage() {
  const premium = usePremium();
  const [config, setConfig] = useState<Config | null>(null);
  const [plano, setPlano] = useState<"mensal" | "anual">("mensal");
  const [uploading, setUploading] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<Solic[]>([]);

  useEffect(() => {
    supabase.rpc("get_payment_info").then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row) setConfig({
        nome_recebedor: row.nome_recebedor,
        chave_pix: row.chave_pix,
        tipo_chave_pix: row.tipo_chave_pix,
        valor_mensal: Number(row.valor_mensal),
        valor_anual: Number(row.valor_anual),
        dias_teste_gratis: row.dias_teste_gratis,
        mensagem_pagamento: row.mensagem_pagamento,
      });
    });
    loadSolic();
  }, []);

  async function loadSolic() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("solicitacoes_premium")
      .select("id, plano, valor, status, created_at, observacao_admin")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });
    if (data) setSolicitacoes(data as Solic[]);
  }

  async function copiar() {
    if (!config?.chave_pix) { toast.error("Chave PIX não configurada ainda"); return; }
    await navigator.clipboard.writeText(config.chave_pix);
    toast.success("Chave PIX copiada!");
  }

  async function enviarComprovante(file: File) {
    if (!config) return;
    if (file.size > 5_000_000) { toast.error("Arquivo grande demais (máx 5MB)"); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("comprovantes").upload(path, file);
      if (up.error) throw up.error;

      const { data: prof } = await supabase.from("profiles").select("nome, telefone, email").eq("id", u.user.id).maybeSingle();
      const valor = plano === "mensal" ? config.valor_mensal : config.valor_anual;
      const { error } = await supabase.from("solicitacoes_premium").insert({
        user_id: u.user.id,
        nome: prof?.nome || u.user.email || "Sem nome",
        telefone: prof?.telefone || null,
        email: prof?.email || u.user.email || null,
        plano,
        valor,
        comprovante_path: path,
      });
      if (error) throw error;
      toast.success("Comprovante enviado! Aguardando aprovação.");
      loadSolic();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell title="Premium" back="/mais">
      <div className="ep-card bg-gradient-to-br from-primary/20 via-card to-card border-primary/40 text-center">
        <Crown className="size-10 text-primary mx-auto" />
        <h2 className="mt-2 text-xl font-bold">Central Financeira Premium</h2>
        {premium.ativo ? (
          <div className="mt-3">
            <span className="ep-badge-premium">Plano {premium.plano} ativo</span>
            <div className="text-xs text-muted-foreground mt-2">
              Válido até {premium.dataValidade?.toLocaleDateString("pt-BR")}
              {" "}({premium.diasRestantes} dias)
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            Acesso completo a contas fixas, cartões, fluxo de caixa, metas e mais.
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setPlano("mensal")}
          className={`ep-card text-center ${plano === "mensal" ? "border-primary ring-2 ring-primary/40" : ""}`}
        >
          <div className="text-xs text-muted-foreground">Mensal</div>
          <div className="text-2xl font-bold mt-1">R$ {config?.valor_mensal.toFixed(2).replace(".", ",")}</div>
          <div className="text-[10px] text-muted-foreground mt-1">/ mês</div>
        </button>
        <button
          onClick={() => setPlano("anual")}
          className={`ep-card text-center ${plano === "anual" ? "border-primary ring-2 ring-primary/40" : ""}`}
        >
          <div className="text-xs text-muted-foreground">Anual</div>
          <div className="text-2xl font-bold mt-1">R$ {config?.valor_anual.toFixed(2).replace(".", ",")}</div>
          <div className="text-[10px] text-primary mt-1 font-semibold">economiza ~40%</div>
        </button>
      </div>

      <section className="mt-4 ep-card">
        <h3 className="font-semibold mb-2">Pague via PIX</h3>
        {config?.chave_pix ? (
          <>
            <div className="text-xs text-muted-foreground">Recebedor</div>
            <div className="font-medium">{config.nome_recebedor || "—"}</div>
            <div className="text-xs text-muted-foreground mt-2">Chave PIX ({config.tipo_chave_pix})</div>
            <div className="font-mono text-sm bg-secondary/50 rounded-md p-2 mt-1 break-all">{config.chave_pix}</div>
            <button onClick={copiar} className="mt-3 w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
              <Copy className="size-4" /> Copiar chave PIX
            </button>
            {config.mensagem_pagamento && (
              <p className="text-xs text-muted-foreground mt-3">{config.mensagem_pagamento}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chave PIX ainda não configurada pelo administrador.
          </p>
        )}
      </section>

      <section className="mt-4 ep-card">
        <h3 className="font-semibold mb-2">Envie o comprovante</h3>
        <label className={`block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer ${uploading ? "opacity-50" : ""}`}>
          {uploading ? <Loader2 className="size-6 mx-auto animate-spin text-primary" /> : <Upload className="size-6 mx-auto text-primary" />}
          <div className="text-sm mt-2">
            {uploading ? "Enviando..." : "Toque para escolher imagem/PDF do comprovante"}
          </div>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarComprovante(f); e.target.value = ""; }}
          />
        </label>
      </section>

      {solicitacoes.length > 0 && (
        <section className="mt-4 ep-card">
          <h3 className="font-semibold mb-2">Suas solicitações</h3>
          <ul className="divide-y divide-border">
            {solicitacoes.map((s) => (
              <li key={s.id} className="py-2 flex items-center gap-2">
                {s.status === "aprovado" ? <CheckCircle2 className="size-4 text-success" /> :
                 s.status === "recusado" ? <XCircle className="size-4 text-destructive" /> :
                 <Clock className="size-4 text-warning" />}
                <div className="flex-1">
                  <div className="text-sm font-medium capitalize">Plano {s.plano} — R$ {Number(s.valor).toFixed(2).replace(".", ",")}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("pt-BR")} — {s.status}
                    {s.observacao_admin ? ` • ${s.observacao_admin}` : ""}
                  </div>
                </div>
                {s.status === "aprovado" && <Check className="size-4 text-success" />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
