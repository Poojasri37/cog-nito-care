import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, MicOff, Pill, Send, Volume2, VolumeX, Sun, Moon, Camera, Gamepad2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { FAMILY, MEDICATIONS, PATIENT } from "@/lib/care-data";
import { buildContext, today, useCare } from "@/lib/care-store";
import { mockReply, routeIntent, speak, streamCompanion } from "@/lib/companion-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/companion")({
  validateSearch: z.object({ scenario: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Patient Companion — CareCompanion AI" },
      { name: "description", content: "Calm, high-contrast voice companion for Margaret with reassurance loops and memory-aware conversation." },
      { property: "og:title", content: "Patient Companion — CareCompanion AI" },
      { property: "og:description", content: "Calm, high-contrast voice companion with memory-aware conversation." },
    ],
  }),
  component: Companion,
});

const QUICK = ["Where am I?", "Who is coming today?", "I can't find my glasses", "Tell me about Arthur", "Have I taken my tablets?", "I'd like to play a game"];
const SCENARIO_TEXT: Record<string, string> = { "where-am-i": "Where am I? I want to go home.", glasses: "I can't find my glasses anywhere." };

declare global {
  interface Window { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike }
}
type SpeechRecognitionLike = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void; stop: () => void };

function Companion() {
  const { state, addMessage, updateMessage, processUtterance, trace, takeMed, clearConversation, setShortTerm } = useCare();
  const { scenario } = Route.useSearch();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [lastAgent, setLastAgent] = useState("CompanionAgent");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ranScenario = useRef(false);
  const msgs = state.shortTerm.messages;

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs.length, msgs[msgs.length - 1]?.text]);
  useEffect(() => { setShortTerm({ currentActivity: "companion" }); inputRef.current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    setBusy(true);
    trace("Input Processor", `Utterance received (${clean.length} chars)`);
    addMessage("user", clean);
    const res = processUtterance(clean);
    const agent = routeIntent(clean, res.signals);
    setLastAgent(agent);
    trace("Intent Router", `Selected ${agent}`);
    const context = buildContext(state, clean);
    trace("Memory Retriever", `${context.episodes.length} episodes, ${context.facts.length} facts retrieved`);
    const history = [...msgs, { role: "user" as const, text: clean }].slice(-12).map((m) => ({ role: m.role, text: m.text }));
    const placeholder = addMessage("assistant", "");
    // compassionate pacing — a short pause before replying
    await new Promise((r) => setTimeout(r, 600));
    const out = await streamCompanion({ messages: history, context, agent }, (full) => updateMessage(placeholder.id, full));
    let reply = out.text;
    if (out.source === "fallback") {
      reply = mockReply(clean, agent);
      updateMessage(placeholder.id, reply);
      trace("Response Generator", `Deterministic fallback used (${out.error ?? "offline"})`);
    } else trace("Response Generator", "LLM response streamed");
    if (voiceOn) speak(reply);
    setBusy(false);
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (scenario && SCENARIO_TEXT[scenario] && !ranScenario.current) {
      ranScenario.current = true;
      setTimeout(() => send(SCENARIO_TEXT[scenario]), 500);
    }
  }, [scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMic() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input isn't supported in this browser. Try Chrome or Edge."); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.onresult = (e) => send(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  const hour = new Date().getHours();
  const nextMed = MEDICATIONS.find((m) => state.medsTaken[m.id] !== today() && parseInt(m.time) <= hour + 1);
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className={cn("min-h-screen", contrast && "dark bg-background text-foreground")}>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl md:text-5xl">{greeting}, {PATIENT.preferredName}.</h1>
            <p className="mt-2 text-xl text-muted-foreground">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · You're at home in Bath
            </p>
          </div>
          <div className="flex gap-2">
            <IconBtn label={contrast ? "Light mode" : "High contrast"} onClick={() => setContrast((c) => !c)}>{contrast ? <Sun /> : <Moon />}</IconBtn>
            <IconBtn label={voiceOn ? "Mute voice" : "Speak replies"} onClick={() => { setVoiceOn((v) => !v); window.speechSynthesis?.cancel(); }}>{voiceOn ? <Volume2 /> : <VolumeX />}</IconBtn>
            <IconBtn label="New conversation" onClick={clearConversation}><RotateCcw /></IconBtn>
          </div>
        </header>

        {nextMed && (
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-accent bg-accent/20 p-5">
            <Pill className="h-8 w-8 text-accent-foreground dark:text-accent" />
            <div className="flex-1 text-xl">Time for <strong>{nextMed.name}</strong> {nextMed.dose}{nextMed.withFood ? ", with some food" : ""}.</div>
            <button onClick={() => takeMed(nextMed.id)} className="min-h-14 rounded-xl bg-primary px-6 text-lg font-bold text-primary-foreground">I've taken it</button>
          </div>
        )}

        <div className="mt-6 flex-1 space-y-5 rounded-3xl border border-border bg-card p-5 md:p-8" aria-live="polite">
          {msgs.length === 0 && (
            <div className="text-center py-10">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-primary/10 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-primary/70" />
              </div>
              <p className="mt-6 text-2xl">I'm here with you. What would you like to talk about?</p>
              <p className="mt-2 text-lg text-muted-foreground">Press the big microphone, or tap a sentence below.</p>
            </div>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] text-2xl leading-relaxed", m.role === "user" ? "rounded-3xl rounded-br-md bg-primary px-6 py-4 text-primary-foreground" : "text-card-foreground")}>
                {m.text || <span className="inline-flex gap-1.5 py-3"><Dot /><Dot d="150ms" /><Dot d="300ms" /></span>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q} disabled={busy} onClick={() => send(q)} className="min-h-12 rounded-full border-2 border-border bg-card px-5 text-lg hover:border-primary disabled:opacity-50">{q}</button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-4 flex items-center gap-3">
          <button type="button" onClick={toggleMic} aria-label={listening ? "Stop listening" : "Speak"} className={cn("grid h-20 w-20 shrink-0 place-items-center rounded-full text-primary-foreground shadow-lg transition", listening ? "bg-destructive animate-pulse" : "bg-primary hover:scale-105")}>
            {listening ? <MicOff className="h-9 w-9" /> : <Mic className="h-9 w-9" />}
          </button>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type here…" className="h-20 flex-1 rounded-2xl border-2 border-border bg-card px-6 text-2xl outline-none focus:border-primary" />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground disabled:opacity-40"><Send className="h-8 w-8" /></button>
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {FAMILY.slice(1, 4).map((f) => (
            <button key={f.id} onClick={() => send(`Tell me about ${f.name}`)} className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left">
              <span className="grid h-12 w-12 place-items-center rounded-full font-bold text-primary-foreground" style={{ background: `oklch(0.55 0.1 ${f.hue})` }}>{f.initials}</span>
              <span><span className="block text-lg font-bold">{f.name}</span><span className="text-sm text-muted-foreground">{f.relation}</span></span>
            </button>
          ))}
          <Link to="/therapy" className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-3 text-lg font-bold"><Gamepad2 className="h-7 w-7 text-primary" /> Games & photos</Link>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Active agent: <strong>{lastAgent}</strong> · Mood: {state.shortTerm.mood}</span>
          <Link to="/perception" className="inline-flex items-center gap-1"><Camera className="h-4 w-4" /> Camera</Link>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-border bg-card [&_svg]:h-6 [&_svg]:w-6">{children}</button>
  );
}
function Dot({ d = "0ms" }: { d?: string }) {
  return <span className="h-3 w-3 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: d }} />;
}
