import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  observacao: z.string().trim().min(3).max(500),
});

const AnalysisSchema = z.object({
  resumo: z.string(),
  problemas: z.array(z.string()),
  categorias: z.array(z.string()),
  acoesRecomendadas: z.array(z.string()),
  prioridade: z.enum(["baixa", "media", "alta"]),
});

export type ObservationAnalysis = z.infer<typeof AnalysisSchema>;

function safeGatewayMessage(error: unknown) {
  const fallback = "Não foi possível analisar a observação agora.";
  if (!(error instanceof Error)) return fallback;

  const candidate = error as Error & {
    statusCode?: number;
    responseBody?: string;
  };
  const status = candidate.statusCode;
  let upstreamMessage = "";
  if (candidate.responseBody) {
    try {
      const parsed = JSON.parse(candidate.responseBody) as { message?: string; error?: { message?: string } };
      upstreamMessage = parsed.message ?? parsed.error?.message ?? "";
    } catch {
      upstreamMessage = "";
    }
  }

  if (status === 401) return "A análise inteligente ainda não está configurada.";
  if (status === 402) return upstreamMessage || "Os créditos de análise estão indisponíveis no momento.";
  if (status === 403) return upstreamMessage || "A análise inteligente está bloqueada para este espaço de trabalho.";
  if (status === 429) return upstreamMessage || "Muitas análises foram solicitadas. Aguarde um pouco e tente novamente.";
  if (status && status >= 500) return upstreamMessage || "O serviço de análise está temporariamente indisponível.";
  return upstreamMessage || fallback;
}

export const analyzeObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A análise inteligente ainda não está configurada.");

    try {
      const { createLovableResponsesProvider } = await import("@/lib/ai-gateway.server");
      const result = streamText({
        model: createLovableResponsesProvider(apiKey),
        maxRetries: 0,
        output: Output.object({ schema: AnalysisSchema }),
        system:
          "Você auxilia motoristas de entrega no Brasil. Analise somente o relato fornecido, sem inventar fatos. Não dê aconselhamento jurídico, médico ou financeiro. Use linguagem curta, prática e respeitosa.",
        prompt: `Analise esta observação de uma rota de entregas:\n\n${data.observacao}\n\nRetorne um resumo curto, até 5 problemas concretos, até 4 categorias, até 5 ações recomendadas e prioridade baixa, media ou alta. Se não houver problema, use listas vazias e recomende apenas registrar o ocorrido.`,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });

      const output = await result.output;
      return {
        ...output,
        problemas: output.problemas.slice(0, 5),
        categorias: output.categorias.slice(0, 4),
        acoesRecomendadas: output.acoesRecomendadas.slice(0, 5),
      } satisfies ObservationAnalysis;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("A análise não retornou um resultado completo. Tente novamente.");
      }
      throw new Error(safeGatewayMessage(error));
    }
  });