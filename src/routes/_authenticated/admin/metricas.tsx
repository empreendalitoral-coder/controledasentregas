import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/metricas")({
  head: () => ({ meta: [
    { title: "Métricas de crescimento — Entrega Pro" },
    { name: "description", content: "Visitas, contas ativas e assinaturas do Entrega Pro." },
    { property: "og:title", content: "Métricas de crescimento — Entrega Pro" },
    { property: "og:description", content: "Acompanhe o crescimento do Entrega Pro." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Metricas,
});

type Dia = { dia: string; visitas: number; cadastros: number; ativas: number; assinaturas: number };
type M = {
  visitas: number; visitantes: number; cadastros: number; total_contas: number;
  ativas_7d: number; ativas_periodo: number; assinantes: number; em_teste: number;
  novas_assinaturas: number; dias: Dia[];
};

function Metricas() {
  const [dias, setDias] = useState(30);
  const [m, setM] = useState<M | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErro(null);
    const { data, error } = await supabase.rpc("get_growth_metrics", { _days: dias });
    if (error) { setErro("Não foi possível carregar as métricas."); return; }
    setM(data as unknown as M);
  }, [dias]);
  useEffect(() => { setM(null); load(); }, [load]);

  const conv = m && m.total_contas > 0 ? ((m.assinantes / m.total_contas) * 100).toFixed(1).replace(".", ",") + "%" : "—";
  const max = m ? Math.max(1, ...m.dias.map((d) => d.visitas)) : 1;

  return (
    <div className="space-y-4">
      <div className="ep-card flex gap-1 p-1">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDias(d)}
            className={`flex-1 h-9 rounded-md text-xs font-medium ${dias === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {d} dias
          </button>
        ))}
      </div>

      {erro && (
        <div className="ep-card text-center text-sm">
          {erro} <button onClick={load} className="text-primary font-semibold ml-1">Tentar de novo</button>
        </div>
      )}
      {!m && !erro && <div className="text-center text-sm text-muted-foreground py-8">Carregando…</div>}

      {m && (
        <>
          <Secao titulo="Visitas">
            <Card label="Visitas no período" v={m.visitas} />
            <Card label="Visitantes diferentes" v={m.visitantes} />
          </Secao>
          <Secao titulo="Contas">
            <Card label="Total de contas" v={m.total_contas} />
            <Card label="Novos cadastros" v={m.cadastros} />
            <Card label="Ativas nos últimos 7 dias" v={m.ativas_7d} />
            <Card label="Ativas no período" v={m.ativas_periodo} />
          </Secao>
          <Secao titulo="Assinaturas">
            <Card label="Assinantes Premium" v={m.assinantes} />
            <Card label="Em teste grátis" v={m.em_teste} />
            <Card label="Novas assinaturas" v={m.novas_assinaturas} />
            <Card label="Contas que assinam" v={conv} />
          </Secao>

          <div className="ep-card">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Visitas por dia</div>
            <div className="flex items-end gap-[2px] h-28">
              {m.dias.map((d) => (
                <div key={d.dia} title={`${d.dia}: ${d.visitas}`} className="flex-1 bg-primary/80 rounded-t"
                  style={{ height: `${(d.visitas / max) * 100}%`, minHeight: d.visitas ? 3 : 1 }} />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Visitas começaram a ser contadas em 5/11/2026.</p>
          </div>

          <div className="ep-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr><th className="text-left py-1">Dia</th><th className="text-right">Visitas</th><th className="text-right">Cadastros</th><th className="text-right">Ativas</th><th className="text-right">Assin.</th></tr>
              </thead>
              <tbody>
                {[...m.dias].reverse().map((d) => (
                  <tr key={d.dia} className="border-t border-border">
                    <td className="py-1">{d.dia.split("-").reverse().slice(0, 2).join("/")}</td>
                    <td className="text-right">{d.visitas}</td><td className="text-right">{d.cadastros}</td>
                    <td className="text-right">{d.ativas}</td><td className="text-right">{d.assinaturas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{titulo}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Card({ label, v }: { label: string; v: number | string }) {
  return (
    <div className="ep-card">
      <div className="text-2xl font-bold">{v}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
