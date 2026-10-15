import { FAMILY, OBJECTS } from "./care-data";

export type Agent = "CompanionAgent" | "SafetyAgent" | "MemoryAgent" | "ReminderAgent" | "VisionAgent" | "TherapyAgent";

export function routeIntent(
  text: string,
  signals: { confusion: boolean; agitation: boolean; object?: string },
  family: typeof FAMILY = FAMILY,
): Agent {
  const t = text.toLowerCase();
  if (signals.agitation || signals.confusion) return "SafetyAgent";
  if (signals.object) return "VisionAgent";
  if (/(medicine|pill|tablet|medication)/.test(t)) return "ReminderAgent";
  if (/(remember|photo|who is|tell me about)/.test(t) || family.some((f) => t.includes(f.name.toLowerCase()))) return "MemoryAgent";
  if (/(game|play|bored|exercise|stretch)/.test(t)) return "TherapyAgent";
  return "CompanionAgent";
}

/** Deterministic fallback when the AI service is unavailable. */
export function mockReply(text: string, agent: Agent): string {
  const t = text.toLowerCase();
  const obj = OBJECTS.find((o) => t.includes(o.name.toLowerCase().split(" ").pop()!));
  if (obj) return `Don't worry, Maggie. Your ${obj.name.toLowerCase()} usually live ${obj.usual.toLowerCase()}. Shall we look there together?`;
  if (t.includes("arthur")) return "You loved Arthur very much, Maggie. I remember your wedding at St. Swithin's — you carried white daisies. Would you like to look at that photo?";
  if (agent === "SafetyAgent") return "You're safe, Maggie. You're at home on Willow Lane in Bath. Priya is here today, and Sarah visits on Sunday. Shall we have a cup of Earl Grey?";
  const f = FAMILY.find((x) => t.includes(x.name.toLowerCase()));
  if (f) return `${f.name} is your ${f.relation.toLowerCase()}. ${f.facts[f.facts.length - 1]}. Would you like to tell me about ${f.name}?`;
  if (agent === "ReminderAgent") return "Your morning tablets are Donepezil and Amlodipine, with breakfast. Let's take them with a glass of water.";
  if (agent === "TherapyAgent") return "What a lovely idea. Shall we play the memory tiles game, or do some gentle seated stretches?";
  return "That's lovely, Maggie. I'm right here with you. Tell me more — I'd love to hear.";
}

export async function streamCompanion(
  body: { messages: { role: "user" | "assistant"; text: string }[]; context: unknown; agent: Agent },
  onDelta: (full: string) => void,
): Promise<{ text: string; source: "ai" | "fallback"; error?: string }> {
  try {
    const res = await fetch("/api/companion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ error: `Error ${res.status}` }));
      return { text: "", source: "fallback", error: err.error };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      full += dec.decode(value, { stream: true });
      onDelta(full);
    }
    if (!full.trim()) return { text: "", source: "fallback", error: "Empty AI response" };
    return { text: full, source: "ai" };
  } catch (e) {
    return { text: "", source: "fallback", error: (e as Error).message };
  }
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.85;
  u.pitch = 1;
  const v = window.speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}
