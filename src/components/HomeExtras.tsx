import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Check, ChevronRight, Crown, X } from "lucide-react";
import { PrivatePhoto } from "@/components/PrivatePhoto";

const KEY = "ep-onboarding-dismissed";

export function OnboardingCard({ temLancamento }: { temLancamento: boolean }) {
  const [visible, setVisible] = useState(false);
  const [viuLucro, setViuLucro] = useState(false);
  useEffect(() => {
    setVisible(localStorage.getItem(KEY) !== "1");
    setViuLucro(localStorage.getItem("ep-onboarding-lucro") === "1");
  }, []);
  if (!visible) return null;
  const fechar = () => {
    localStorage.setItem(KEY, "1");
    setVisible(false);
  };
  const passos = [
    { feito: temLancamento, texto: "Lance seu primeiro dia", to: "/lancamento/$id" as const, params: { id: "novo" } },
    { feito: viuLucro, texto: "Veja seu lucro", to: "/resumo" as const, onClick: () => localStorage.setItem("ep-onboarding-lucro", "1") },
    { feito: false, texto: "Conheça o Premium", to: "/premium" as const },
  ];
  return (
    <section className="ep-card mt-3 border-primary/40">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">Comece em 3 passos</div>
        <button onClick={fechar} aria-label="Fechar guia" className="text-muted-foreground"><X className="size-4" /></button>
      </div>
      <ol className="mt-2 space-y-1.5">
        {passos.map((p, i) => (
          <li key={p.texto}>
            <Link to={p.to} params={p.params as never} onClick={p.onClick} className="flex items-center gap-2 h-10 px-2 rounded-lg bg-secondary text-xs">
              <span className={`size-6 rounded-full grid place-items-center text-[11px] font-bold ${p.feito ? "bg-primary text-primary-foreground" : "border border-border"}`}>
                {p.feito ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={`flex-1 ${p.feito ? "line-through text-muted-foreground" : ""}`}>{p.texto}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TrialEndingBanner({ dias }: { dias: number }) {
  return (
    <Link to="/premium" className="ep-card mt-3 flex items-center gap-3 border-warning/50 bg-warning/10">
      <Crown className="size-5 text-warning shrink-0" />
      <div className="flex-1 text-xs">
        <div className="font-semibold text-sm">{dias <= 0 ? "Seu teste Premium termina hoje" : "Seu teste Premium termina amanhã"}</div>
        <div className="text-muted-foreground mt-0.5">Continue com relatórios, separação CNPJ/CPF e Feed por R$ 9,90/mês.</div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

export function FeedPreview() {
  const [fotos, setFotos] = useState<{ id: string; image_path: string }[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: rows } = await supabase
        .from("feed_posts")
        .select("id, image_path")
        .is("removed_at", null)
        .order("created_at", { ascending: false })
        .limit(3);
      if (!rows?.length) return;
      if (alive) setFotos(rows);
    })();
    return () => { alive = false; };
  }, []);
  if (!fotos.length) return null;
  return (
    <>
      <div className="ep-section-title mt-4 flex items-center justify-between">
        <span>Feed da Estrada</span>
        <Link to="/feed" className="text-xs text-primary normal-case">Ver tudo →</Link>
      </div>
      <Link to="/feed" className="grid grid-cols-3 gap-1.5">
        {fotos.map((f) => (
          <PrivatePhoto key={f.id} bucket="feed-photos" path={f.image_path} alt="Foto do Feed" loading="lazy" className="aspect-square w-full object-cover rounded-lg" />
        ))}
      </Link>
      <Link to="/feed" className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Camera className="size-3.5" /> Veja o dia a dia dos colegas
      </Link>
    </>
  );
}
