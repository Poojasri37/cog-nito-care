import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/lib/ai/run-id.server";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) })).max(40),
  context: z.record(z.string(), z.unknown()),
  agent: z.string().max(40).optional(),
});

function systemPrompt(context: unknown, agent?: string) {
  const patient = context && typeof context === "object" && "patient" in context
    ? (context as { patient?: { preferredName?: string } }).patient
    : undefined;
  const name = patient?.preferredName || "the patient";
  return `You are CareCompanion, a warm, patient AI companion for a person living with dementia. Active agent: ${agent ?? "CompanionAgent"}.
This is an assistive research prototype — never diagnose, never give medical advice beyond reading the existing schedule.

Speaking style (critical):
- Use short, simple sentences (max 3 sentences, under 55 words total).
- Address the patient as ${name}. Be gentle, unhurried, reassuring. One question at a time.
- Never say "you already asked" or correct her harshly. Validate feelings first, then gently orient.
- Do not assume or invent relationships, diagnoses, routines, or personal details not present in the retrieved context.
- If the patient is confused or anxious: reassure them, use location and visitor details only when they are in context, and suggest a calming activity.
- If she's looking for an object, tell her its usual place from memory.
- Weave in relevant memories naturally from the context. Never invent family facts not in context.

Retrieved memory & context (JSON):
${JSON.stringify(context, null, 1)}`;
}

export const Route = createFileRoute("/api/companion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        const openRouterKey = process.env["OPENROUTER_API_KEY"];
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const apiKey = openRouterKey ?? lovableKey;
        if (!apiKey) return Response.json({ error: "Set OPENROUTER_API_KEY or LOVABLE_API_KEY in the server environment." }, { status: 401 });

        const provider = openRouterKey
          ? createOpenAI({
              baseURL: "https://openrouter.ai/api/v1",
              apiKey: openRouterKey,
              headers: { "HTTP-Referer": process.env["OPENROUTER_SITE_URL"] ?? "http://localhost:8080", "X-OpenRouter-Title": "CareCompanion" },
            })
          : createOpenAI({
              baseURL: "https://ai.gateway.lovable.dev/v1",
              apiKey: lovableKey!,
              headers: { "Lovable-API-Key": lovableKey!, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
              fetch: createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request)).fetch,
            });
        const messages: ModelMessage[] = parsed.data.messages.map((m) => ({ role: m.role, content: m.text }));
        let upstreamError: { status: number; message: string } | null = null;
        const result = streamText({
          model: openRouterKey
            ? provider.chat(process.env["OPENROUTER_MODEL"] ?? "openai/gpt-oss-20b:free")
            : provider.responses("openai/gpt-6-astra"),
          system: systemPrompt(parsed.data.context, parsed.data.agent),
          messages,
          abortSignal: request.signal,
          providerOptions: openRouterKey ? undefined : {
            openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
          },
          onError: ({ error }) => {
            const e = error as { statusCode?: number; message?: string };
            upstreamError = { status: e.statusCode ?? 500, message: e.message ?? "AI error" };
            console.error(error);
          },
        });
        const res = result.toTextStreamResponse();
        if (upstreamError) return Response.json({ error: (upstreamError as { message: string }).message }, { status: (upstreamError as { status: number }).status });
        return res;
      },
    },
  },
});
