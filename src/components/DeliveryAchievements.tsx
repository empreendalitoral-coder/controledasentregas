import { Award, Check, Lock, Medal, Trophy } from "lucide-react";
import { NUM } from "@/lib/calc";
import { deliveryAchievements } from "@/lib/delivery-achievements";
import { useFullStore } from "@/lib/store";

const icons = [Medal, Award, Trophy];

export function DeliveryAchievements() {
  const state = useFullStore();
  const result = deliveryAchievements(state.lancamentos);

  return (
    <section aria-label="Minhas conquistas" className="mb-6 border-b border-border pb-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold"><Trophy className="size-5 text-primary" />Minhas conquistas</h2>
        {state.hydrated && !state.loadError && <span className="text-xs text-muted-foreground">{NUM(result.delivered)} entregas concluídas</span>}
      </div>
      {state.loadError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar suas conquistas. Tente novamente.</p> : !state.hydrated ? <p role="status" className="text-sm text-muted-foreground">Carregando conquistas…</p> : <>
        <div className="grid grid-cols-3 gap-2">
          {result.milestones.map((milestone, index) => {
            const Icon = icons[index] ?? Medal;
            return <div key={milestone.target} className={`flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center ${milestone.unlocked ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/30"}`} aria-label={`${NUM(milestone.target)} entregas: ${milestone.unlocked ? "conquistado" : "a conquistar"}`}>
              <Icon className={`mb-1 size-8 ${milestone.unlocked ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              <strong className="text-lg">{NUM(milestone.target)}</strong>
              <span className="text-xs text-muted-foreground">entregas</span>
              <span className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${milestone.unlocked ? "text-success" : "text-muted-foreground"}`}>{milestone.unlocked ? <Check className="size-3" /> : <Lock className="size-3" />}{milestone.unlocked ? "Conquistado" : "A conquistar"}</span>
            </div>;
          })}
        </div>
        {result.next ? <div className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">Faltam <strong className="text-foreground">{NUM(result.remaining)} entregas</strong> para o próximo selo.</p>
          <progress className="h-1.5 w-full overflow-hidden rounded-full bg-secondary accent-primary [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" value={result.delivered} max={result.next.target} aria-label={`Progresso para ${NUM(result.next.target)} entregas`} />
        </div> : <p className="mt-3 flex items-center gap-2 text-xs font-medium text-success"><Check className="size-4" />Todos os selos conquistados. Boa rota!</p>}
      </>}
    </section>
  );
}