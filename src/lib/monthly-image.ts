import type { monthlyShareMetrics } from "@/lib/monthly-share";

type ImageData = { period: string; metrics: ReturnType<typeof monthlyShareMetrics>; showProfit: boolean; link: string };

/** Browser-only, called after hydration; the artwork uses the active theme tokens. */
export async function renderMonthlyImage(data: ImageData): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar a imagem neste aparelho.");
  const theme = getComputedStyle(document.documentElement);
  const color = (name: string) => theme.getPropertyValue(`--${name}`).trim();
  ctx.fillStyle = color("background");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  function text(value: string, x: number, y: number, size: number, token = "foreground", weight = 600, maxWidth = 936) {
    ctx.font = `${weight} ${size}px Outfit, sans-serif`;
    while (ctx.measureText(value).width > maxWidth && size > 20) {
      size -= 2;
      ctx.font = `${weight} ${size}px Outfit, sans-serif`;
    }
    ctx.fillStyle = color(token);
    ctx.fillText(value, x, y);
  }
  ctx.fillStyle = color("primary");
  ctx.fillRect(72, 72, 12, 66);
  text("ENTREGA PRO", 108, 120, 42, "primary", 700);
  text("MEU MÊS NA ESTRADA", 72, 226, 32, "muted-foreground", 500);
  text(data.period, 72, 294, 62, "foreground", 700);
  // Parcel artwork, not an external image: retains crisp edges in the exported PNG.
  ctx.strokeStyle = color("primary");
  ctx.lineWidth = 6;
  ctx.strokeRect(76, 358, 82, 74);
  ctx.beginPath(); ctx.moveTo(117, 358); ctx.lineTo(117, 390); ctx.stroke();
  text(data.metrics.entregas, 72, 575, 142, "foreground", 700);
  text("entregas concluídas", 76, 633, 38, "muted-foreground", 500);
  ctx.strokeStyle = color("border");
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(72, 686); ctx.lineTo(1008, 686); ctx.stroke();
  text("TAXA DE ENTREGA", 72, 748, 26, "muted-foreground", 500);
  text(data.metrics.taxa, 72, 818, 64, "primary", 700, 430);
  text(data.showProfit ? "LUCRO REAL" : "DIAS TRABALHADOS", 568, 748, 26, "muted-foreground", 500);
  text(data.showProfit ? data.metrics.lucro : data.metrics.dias, 568, 818, 64, data.showProfit ? "success" : "foreground", 700, 440);
  text(data.metrics.km, 72, 925, 36, "foreground");
  text(data.showProfit ? `${data.metrics.dias} dias trabalhados` : "Cada entrega conta.", 72, 975, 30, "muted-foreground", 500);
  ctx.fillStyle = color("primary");
  ctx.fillRect(0, 1050, 1080, 300);
  text("Sua rota. Seus resultados.", 72, 1128, 44, "primary-foreground", 700);
  text("meuentregapro.app", 72, 1190, 40, "primary-foreground", 600);
  if (data.link.includes("?ref=")) {
    text("Meu link de indicação:", 72, 1250, 24, "primary-foreground", 500);
    text(data.link, 72, 1290, 24, "primary-foreground", 500);
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error("Não foi possível gerar a imagem. Tente novamente."));
  }, "image/png"));
}

export function downloadMonthlyImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Let the browser start the download before releasing the local URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}