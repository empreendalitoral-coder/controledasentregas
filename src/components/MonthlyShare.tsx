import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { referralQuery, referralLandingLink } from "@/lib/referrals";
import type { Resumo } from "@/lib/calc";
import { monthlyShareCaption, monthlyShareMetrics } from "@/lib/monthly-share";
import { downloadMonthlyImage, renderMonthlyImage } from "@/lib/monthly-image";

export function MonthlyShare({ resumo, period, filename, ready }: { resumo: Resumo; period: string; filename: string; ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [showProfit, setShowProfit] = useState(false);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const referral = useQuery({ ...referralQuery, enabled: open });
  const code = referral.data?.wallet.code;
  const link = referralLandingLink(code);
  const metrics = monthlyShareMetrics(resumo);
  const waitingForReferral = referral.isFetching;

  useEffect(() => {
    if (!open || waitingForReferral) return;
    let cancelled = false;
    let localUrl: string | undefined;
    setImage(null);
    setError("");
    renderMonthlyImage({ period, metrics, showProfit, link }).then(blob => {
      if (cancelled) return;
      localUrl = URL.createObjectURL(blob);
      setImage({ blob, url: localUrl });
    }).catch(() => {
      if (!cancelled) setError("Não foi possível criar a imagem.");
    });
    return () => { cancelled = true; if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [open, period, metrics.entregas, metrics.taxa, metrics.lucro, metrics.dias, metrics.km, showProfit, link, waitingForReferral, retry]);

  async function share() {
    if (!image || busy) return;
    const file = new File([image.blob], filename, { type: "image/png" });
    const caption = monthlyShareCaption(period, link);
    setBusy(true);
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Meu mês na estrada — Entrega Pro", text: caption });
      } else {
        downloadMonthlyImage(image.blob, filename);
        window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank", "noopener,noreferrer");
        toast.info("Imagem baixada. Anexe-a à mensagem no WhatsApp.");
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) toast.error("Não foi possível compartilhar. Use Baixar imagem.");
    } finally { setBusy(false); }
  }

  return <>
    <Button className="mt-4 w-full" disabled={!ready || resumo.dias_trabalhados === 0} onClick={() => setOpen(true)}><Share2 className="size-4" />Compartilhar meu mês</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-md overflow-y-auto rounded-lg p-4">
        <DialogHeader><DialogTitle>Meu mês na estrada</DialogTitle><DialogDescription>{period}</DialogDescription></DialogHeader>
        <div className="flex items-center justify-between gap-3"><label htmlFor="share-month-profit" className="text-sm">Mostrar meu lucro na imagem</label><Switch id="share-month-profit" checked={showProfit} onCheckedChange={setShowProfit} /></div>
        <div className="aspect-[4/5] w-full overflow-hidden rounded-md bg-card">
          {image && !waitingForReferral ? <img src={image.url} alt={`Resumo de ${period}: ${metrics.entregas} entregas, taxa ${metrics.taxa}${showProfit ? `, lucro ${metrics.lucro}` : ""}`} className="size-full object-contain" /> : error ? <div className="grid size-full place-content-center gap-3 p-4 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="secondary" onClick={() => setRetry(v => v + 1)}>Tentar novamente</Button></div> : <div className="grid size-full place-items-center"><Loader2 className="size-7 animate-spin text-primary" aria-label="Criando imagem" /></div>}
        </div>
        {referral.isError && <p className="text-xs text-muted-foreground">Seu link de indicação não carregou; a imagem usa o endereço do app.</p>}
        <div className="flex flex-col gap-2">
          <Button disabled={!image || waitingForReferral || busy || Boolean(error)} onClick={() => void share()}><Share2 className="size-4" />{busy ? "Compartilhando…" : "Enviar no WhatsApp"}</Button>
          <Button variant="secondary" disabled={!image || waitingForReferral || Boolean(error)} onClick={() => { if (image) downloadMonthlyImage(image.blob, filename); }}><Download className="size-4" />Baixar imagem</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}