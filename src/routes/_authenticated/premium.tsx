import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePremium } from "@/lib/premium";
import {
  Crown,
  Copy,
  Upload,
  Check,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
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
      if (row)
        setConfig({
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
    if (!config?.chave_pix) {
      toast.error("Chave PIX não configurada ainda");
      return;
    }
    await navigator.clipboard.writeText(config.chave_pix);
    toast.success("Chave PIX copiada!");
  }

  async function enviarComprovante(file: File) {
    if (!config) return;
    if (file.size > 5_000_000) {
      toast.error("Arquivo grande demais (máx 5MB)");
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("comprovantes").upload(path, file);
      if (up.error) throw up.error;

      const { data: prof } = await supabase
        .from("profiles")
        .select("nome, telefone, email")
        .eq("id", u.user.id)
        .maybeSingle();
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

  const beneficios = [
    { icon: Zap, label: "Fluxo de caixa avançado" },
    { icon: Shield, label: "Backup em nuvem seguro" },
    { icon: Sparkles, label: "Metas, cartões e PIX" },
  ];

  return (
    <AppShell title="Premium" back="/mais">
      {/* Hero */}
      <div className="ep-hero text-center">
        <div className="relative z-10">
          <div className="mx-auto size-14 rounded-2xl bg-primary/15 grid place-items-center border border-primary/30 shadow-lg shadow-primary/20">
            <Crown className="size-7 text-primary" />
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">
            Central Financeira Premium
          </h2>
          {premium.ativo ? (
            <div className="mt-3 space-y-1">
              <span className="ep-badge-premium">
                <Sparkles className="size-3" />
                Plano {premium.plano} ativo
              </span>
              <div className="text-xs text-muted-foreground">
                Válido até {premium.dataValidade?.toLocaleDateString("pt-BR")} ·{" "}
                <span className="text-primary font-medium">
                  {premium.diasRestantes} dias
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Desbloqueie contas fixas, cartões, fluxo de caixa, metas e muito mais.
            </p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            {beneficios.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-lg bg-background/40 border border-border/70 p-2.5 text-[10.5px] text-muted-foreground flex flex-col items-center gap-1"
              >
                <Icon className="size-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Planos */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setPlano("mensal")}
          className={`ep-card text-left transition ${
            plano === "mensal"
              ? "border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/10"
              : "hover:border-primary/40"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Mensal
          </div>
          <div className="text-2xl font-bold mt-1">
            R$ {config?.valor_mensal.toFixed(2).replace(".", ",") ?? "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">por mês</div>
        </button>
        <button
          onClick={() => setPlano("anual")}
          className={`ep-card text-left relative overflow-hidden transition ${
            plano === "anual"
              ? "border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/10"
              : "hover:border-primary/40"
          }`}
        >
          <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
            POPULAR
          </span>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Anual
          </div>
          <div className="text-2xl font-bold mt-1">
            R$ {config?.valor_anual.toFixed(2).replace(".", ",") ?? "—"}
          </div>
          <div className="text-[10px] text-primary font-semibold">
            economiza ~40%
          </div>
        </button>
      </div>

      {/* PIX */}
      <section className="mt-5 ep-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="ep-icon-chip">
            <Copy className="size-4" />
          </div>
          <h3 className="font-semibold">Pague via PIX</h3>
        </div>
        {config?.chave_pix ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Recebedor
                </div>
                <div className="font-medium text-sm">{config.nome_recebedor || "—"}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Tipo
                </div>
                <div className="font-medium text-sm capitalize">
                  {config.tipo_chave_pix}
                </div>
              </div>
            </div>
            <div className="mt-3 font-mono text-sm bg-secondary/60 rounded-lg p-3 break-all border border-border">
              {config.chave_pix}
            </div>
            <button
              onClick={copiar}
              className="mt-3 w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition"
            >
              <Copy className="size-4" /> Copiar chave PIX
            </button>
            {config.mensagem_pagamento && (
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {config.mensagem_pagamento}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chave PIX ainda não configurada pelo administrador.
          </p>
        )}
      </section>

      {/* Comprovante */}
      <section className="mt-4 ep-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="ep-icon-chip">
            <Upload className="size-4" />
          </div>
          <h3 className="font-semibold">Envie o comprovante</h3>
        </div>
        <label
          className={`block border-2 border-dashed border-primary/30 rounded-xl p-6 text-center cursor-pointer bg-primary/5 hover:bg-primary/10 transition ${
            uploading ? "opacity-50" : ""
          }`}
        >
          {uploading ? (
            <Loader2 className="size-8 mx-auto animate-spin text-primary" />
          ) : (
            <Upload className="size-8 mx-auto text-primary" />
          )}
          <div className="text-sm mt-2 font-medium">
            {uploading ? "Enviando..." : "Toque para escolher o comprovante"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Imagem ou PDF · máx 5MB
          </div>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) enviarComprovante(f);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {/* Solicitações */}
      {solicitacoes.length > 0 && (
        <section className="mt-4 ep-card">
          <h3 className="font-semibold mb-3">Suas solicitações</h3>
          <ul className="space-y-2">
            {solicitacoes.map((s) => {
              const Icon =
                s.status === "aprovado"
                  ? CheckCircle2
                  : s.status === "recusado"
                    ? XCircle
                    : Clock;
              const color =
                s.status === "aprovado"
                  ? "text-green-500 bg-green-500/10"
                  : s.status === "recusado"
                    ? "text-destructive bg-destructive/10"
                    : "text-warning bg-warning/10";
              return (
                <li key={s.id} className="ep-list-row">
                  <div className={`size-9 rounded-lg grid place-items-center ${color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium capitalize">
                      Plano {s.plano} — R${" "}
                      {Number(s.valor).toFixed(2).replace(".", ",")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")} ·{" "}
                      <span className="capitalize">{s.status}</span>
                      {s.observacao_admin ? ` • ${s.observacao_admin}` : ""}
                    </div>
                  </div>
                  {s.status === "aprovado" && (
                    <Check className="size-4 text-green-500" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
