import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIAS_NOTA, type LeituraNota, normalizarLeitura } from "./notas";

const MAX_BYTES = 6 * 1024 * 1024;

export const lerNotaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dataUrl: string }) => {
    if (typeof input?.dataUrl !== "string" || !/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/.test(input.dataUrl)) {
      throw new Error("Envie uma foto (JPG, PNG, WEBP) ou PDF.");
    }
    if (input.dataUrl.length > MAX_BYTES * 1.4) throw new Error("Arquivo muito grande (máx. 6 MB).");
    return input;
  })
  .handler(async ({ data }): Promise<LeituraNota> => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const isPdf = data.dataUrl.startsWith("data:application/pdf");
    const prompt =
      "Você lê notas fiscais, cupons e recibos de motoristas de entrega no Brasil. Extraia os dados e devolva JSON. " +
      `Categoria deve ser uma de: ${CATEGORIAS_NOTA.join(", ")}. Data no formato AAAA-MM-DD. Valor total pago em reais (número). ` +
      "Se não conseguir ler um campo, use null.";
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              isPdf
                ? { type: "input_file", file_data: data.dataUrl, filename: "nota.pdf" }
                : { type: "input_image", image_url: data.dataUrl, detail: "auto" },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "nota",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["data", "fornecedor", "cnpj_emitente", "valor", "categoria", "descricao", "tipo_documento"],
              properties: {
                data: { type: ["string", "null"] },
                fornecedor: { type: ["string", "null"] },
                cnpj_emitente: { type: ["string", "null"] },
                valor: { type: ["number", "null"] },
                categoria: { type: "string", enum: [...CATEGORIAS_NOTA] },
                descricao: { type: ["string", "null"] },
                tipo_documento: { type: "string", enum: ["nota_fiscal", "recibo", "cupom", "outro"] },
              },
            },
          },
        },
      } as never);
      const r = res as unknown as { output_text?: string; output?: { content?: { type: string; text?: string }[] }[] };
      const text =
        r.output_text ??
        r.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text ??
        "";
      return normalizarLeitura(JSON.parse(text));
    } catch (e) {
      console.error("[notas] leitura falhou", e);
      if (e instanceof GatewayError && e.httpStatus === 402) throw new Error("Créditos de leitura esgotados. Preencha manualmente.");
      if (e instanceof GatewayError && e.httpStatus === 429) throw new Error("Muitas leituras agora. Tente em instantes.");
      throw new Error("Não consegui ler o documento. Preencha os dados manualmente.");
    }
  });
