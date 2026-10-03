import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { PHOTOS } from "@/lib/care-data";
import { useCare } from "@/lib/care-store";
import { speak } from "@/lib/companion-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/therapy")({
  head: () => ({
    meta: [
      { title: "Interactive Therapies — CareCompanion AI" },
      { name: "description", content: "Reminiscence photo therapy, cognitive games and a gentle movement coach." },
      { property: "og:title", content: "Interactive Therapies — CareCompanion AI" },
      { property: "og:description", content: "Reminiscence therapy, cognitive stimulation games and gentle movement coaching." },
    ],
  }),
  component: Therapy,
});

const TABS = [
  { id: "reminiscence", label: "Reminiscence" },
  { id: "pattern", label: "Pattern recall" },
  { id: "words", label: "Word association" },
  { id: "tiles", label: "Memory tiles" },
  { id: "movement", label: "Movement coach" },
] as const;

function Therapy() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("reminiscence");
  return (
    <div>
      <PageHeader eyebrow="Therapy engine" title="Interactive Therapies" />
      <div className="px-6 py-6 md:px-10">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("min-h-12 rounded-full px-5 text-lg font-semibold", tab === t.id ? "bg-primary text-primary-foreground" : "border border-border bg-card")}>{t.label}</button>
          ))}
        </div>
        <div className="mt-6">
          {tab === "reminiscence" && <Reminiscence />}
          {tab === "pattern" && <Pattern />}
          {tab === "words" && <Words />}
          {tab === "tiles" && <Tiles />}
          {tab === "movement" && <Movement />}
        </div>
      </div>
    </div>
  );
}

function Reminiscence() {
  const { addEpisode, addScore, trace } = useCare();
  const [i, setI] = useState(0);
  const [p, setP] = useState(0);
  const [answer, setAnswer] = useState("");
  const [shared, setShared] = useState(0);
  const photo = PHOTOS[i];
  const start = useRef(Date.now());
  function share() {
    if (!answer.trim()) return;
    addEpisode({ category: "PHOTO_MEMORY", type: "reminiscence", description: `About "${photo.title}" (${photo.year}): "${answer.slice(0, 120)}"`, person: photo.people[0], importance: 0.85 });
    trace("TherapyAgent", `Reminiscence response stored for ${photo.title}`);
    toast.success("What a lovely memory — saved.");
    setAnswer("");
    setShared((s) => s + 1);
    setP((x) => (x + 1) % photo.prompts.length);
  }
  function finish() {
    addScore({ game: "reminiscence", score: Math.min(100, 55 + shared * 12), durationSec: Math.round((Date.now() - start.current) / 1000) });
    toast.success("Session saved to the caregiver dashboard");
    setShared(0);
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <img src={photo.src} alt={photo.title} width={1024} height={768} className="aspect-[4/3] w-full rounded-2xl object-cover" />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {PHOTOS.map((ph, idx) => (
            <button key={ph.id} onClick={() => { setI(idx); setP(0); }} className={cn("overflow-hidden rounded-xl border-4", idx === i ? "border-primary" : "border-transparent")}>
              <img src={ph.src} alt={ph.title} loading="lazy" width={1024} height={768} className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-sm font-semibold uppercase tracking-widest text-primary">{photo.year}</div>
        <h2 className="text-3xl">{photo.title}</h2>
        <p className="mt-3 text-lg text-muted-foreground">{photo.story}</p>
        <div className="mt-6 rounded-xl bg-accent/25 p-4">
          <div className="text-sm font-semibold">Gentle prompt</div>
          <p className="mt-1 text-2xl">{photo.prompts[p]}</p>
          <button onClick={() => speak(photo.prompts[p])} className="mt-2 text-sm font-semibold text-primary underline">Read aloud</button>
        </div>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} placeholder="Share what you remember… there are no wrong answers." className="mt-4 w-full rounded-xl border-2 border-border bg-background p-3 text-lg outline-none focus:border-primary" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={share} className="min-h-12 rounded-xl bg-primary px-5 font-bold text-primary-foreground">Save memory</button>
          <button onClick={() => setP((x) => (x + 1) % photo.prompts.length)} className="min-h-12 rounded-xl border border-border px-5">Another question</button>
          <button onClick={finish} className="min-h-12 rounded-xl border border-border px-5">Finish session ({shared})</button>
        </div>
      </div>
    </div>
  );
}

const COLORS = ["oklch(0.6 0.13 155)", "oklch(0.72 0.14 70)", "oklch(0.55 0.1 220)", "oklch(0.6 0.14 330)"];
function Pattern() {
  const { addScore } = useCare();
  const [seq, setSeq] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "done">("idle");
  const start = useRef(0);
  async function play(s: number[]) {
    setPhase("show");
    for (const n of s) {
      await new Promise((r) => setTimeout(r, 450));
      setLit(n);
      await new Promise((r) => setTimeout(r, 650));
      setLit(null);
    }
    setInput([]);
    setPhase("input");
  }
  function begin() { start.current = Date.now(); const s = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)]; setSeq(s); play(s); }
  function tap(n: number) {
    if (phase !== "input") return;
    const next = [...input, n];
    setInput(next);
    if (seq[next.length - 1] !== n) {
      const score = Math.min(100, (seq.length - 2) * 20 + 30);
      addScore({ game: "pattern", score, durationSec: Math.round((Date.now() - start.current) / 1000) });
      setPhase("done");
      speak(`Well done! You remembered ${seq.length - 1} colours.`);
      return;
    }
    if (next.length === seq.length) {
      const s = [...seq, Math.floor(Math.random() * 4)];
      setSeq(s);
      setTimeout(() => play(s), 500);
    }
  }
  return (
    <div className="mx-auto max-w-lg text-center">
      <p className="text-xl">{phase === "idle" ? "Watch the colours light up, then tap them in the same order." : phase === "show" ? "Watch carefully…" : phase === "input" ? "Your turn — take your time." : `Lovely effort! Longest pattern: ${seq.length - 1}.`}</p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {COLORS.map((c, i) => (
          <button key={i} onClick={() => tap(i)} aria-label={`Colour ${i + 1}`} className={cn("aspect-square rounded-3xl transition", lit === i ? "scale-105 brightness-125 ring-8 ring-foreground/20" : "opacity-70")} style={{ background: c }} />
        ))}
      </div>
      {(phase === "idle" || phase === "done") && <button onClick={begin} className="mt-6 min-h-14 rounded-xl bg-primary px-8 text-xl font-bold text-primary-foreground">{phase === "done" ? "Play again" : "Start"}</button>}
    </div>
  );
}

const WORDS = [
  { cue: "Rose", options: ["Garden", "Engine", "Ladder"], answer: "Garden" },
  { cue: "Tea", options: ["Cup", "Shoe", "Cloud"], answer: "Cup" },
  { cue: "Beach", options: ["Sand", "Desk", "Lamp"], answer: "Sand" },
  { cue: "School", options: ["Teacher", "River", "Fork"], answer: "Teacher" },
  { cue: "Scone", options: ["Jam", "Brick", "Phone"], answer: "Jam" },
  { cue: "Wedding", options: ["Ring", "Kettle", "Bus"], answer: "Ring" },
];
function Words() {
  const { addScore } = useCare();
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const start = useRef(Date.now());
  const w = WORDS[i];
  function pick(o: string) {
    if (picked) return;
    setPicked(o);
    const ok = o === w.answer;
    if (ok) setCorrect((c) => c + 1);
    setTimeout(() => {
      if (i + 1 >= WORDS.length) {
        const final = correct + (ok ? 1 : 0);
        addScore({ game: "words", score: Math.round((final / WORDS.length) * 100), durationSec: Math.round((Date.now() - start.current) / 1000) });
        toast.success(`Wonderful — ${final} of ${WORDS.length}!`);
        setI(0); setCorrect(0); start.current = Date.now();
      } else setI(i + 1);
      setPicked(null);
    }, 1100);
  }
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="text-sm text-muted-foreground">Word {i + 1} of {WORDS.length}</div>
      <p className="mt-2 text-xl">Which word goes with…</p>
      <div className="mt-2 font-display text-6xl">{w.cue}</div>
      <div className="mt-8 grid gap-3">
        {w.options.map((o) => (
          <button key={o} onClick={() => pick(o)} className={cn("min-h-16 rounded-2xl border-2 text-2xl font-semibold", picked && o === w.answer ? "border-success bg-success/20" : picked === o ? "border-warning bg-warning/20" : "border-border bg-card hover:border-primary")}>{o}</button>
        ))}
      </div>
      {picked && <p className="mt-4 text-xl">{picked === w.answer ? "Yes, that's right!" : `Good try — ${w.answer} goes nicely with ${w.cue.toLowerCase()}.`}</p>}
    </div>
  );
}

const SYMBOLS = ["🌹", "☕", "🐚", "📚", "🎵", "🧁"];
function Tiles() {
  const { addScore } = useCare();
  const deck = useMemo(() => [...SYMBOLS, ...SYMBOLS].map((s, i) => ({ s, k: i })).sort(() => Math.random() - 0.5), []);
  const [cards, setCards] = useState(deck);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => {
    if (open.length !== 2) return undefined;
    const [a, b] = open;
    setMoves((m) => m + 1);
    if (cards[a].s === cards[b].s) { setMatched((m) => [...m, cards[a].s]); setOpen([]); return undefined; }
    const t = setTimeout(() => setOpen([]), 1100);
    return () => clearTimeout(t);
  }, [open, cards]);
  useEffect(() => {
    if (matched.length === SYMBOLS.length) {
      addScore({ game: "tiles", score: Math.max(30, Math.round(100 - (moves - SYMBOLS.length) * 5)), durationSec: Math.round((Date.now() - start.current) / 1000) });
      toast.success("All pairs found — brilliant!");
    }
  }, [matched.length]); // eslint-disable-line react-hooks/exhaustive-deps
  function reset() { setCards([...deck].sort(() => Math.random() - 0.5)); setOpen([]); setMatched([]); setMoves(0); start.current = Date.now(); }
  return (
    <div className="mx-auto max-w-xl">
      <div className="flex justify-between text-lg"><span>Pairs: {matched.length}/{SYMBOLS.length}</span><span>Turns: {moves}</span></div>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {cards.map((c, i) => {
          const show = open.includes(i) || matched.includes(c.s);
          return (
            <button key={c.k} onClick={() => !show && open.length < 2 && setOpen((o) => [...o, i])} className={cn("aspect-square rounded-2xl text-5xl transition", show ? "bg-card border-2 border-primary" : "bg-primary")}>{show ? c.s : ""}</button>
          );
        })}
      </div>
      <button onClick={reset} className="mt-6 min-h-12 rounded-xl border border-border px-6">New game</button>
    </div>
  );
}

const POSES = [
  { name: "Deep breathing", cue: "Sit tall. Breathe in slowly through your nose… and out.", sec: 20 },
  { name: "Shoulder rolls", cue: "Roll your shoulders gently backwards, five times.", sec: 20 },
  { name: "Neck turn", cue: "Slowly turn your head to the left… and back to the middle… then right.", sec: 20 },
  { name: "Seated arm raise", cue: "Lift both arms up in front of you, as high as is comfortable.", sec: 15 },
  { name: "Ankle circles", cue: "Lift one foot slightly and draw small circles with your toes.", sec: 20 },
  { name: "Seated march", cue: "Lift your knees one at a time, like a gentle march.", sec: 20 },
  { name: "Relax", cue: "Rest your hands on your lap. Well done, Maggie.", sec: 15 },
];
function Movement() {
  const { addMovement } = useCare();
  const [i, setI] = useState(-1);
  const [left, setLeft] = useState(0);
  const [posture, setPosture] = useState(75);
  const done = useRef(0);
  useEffect(() => {
    if (i < 0 || i >= POSES.length) return;
    speak(POSES[i].cue);
    setLeft(POSES[i].sec);
    const t = setInterval(() => {
      setPosture(Math.round(70 + Math.random() * 25));
      setLeft((l) => {
        if (l <= 1) { clearInterval(t); done.current++; setI((x) => x + 1); return 0; }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [i]);
  useEffect(() => {
    if (i === POSES.length) { addMovement({ routine: "Seated Morning Stretch", completed: done.current, total: POSES.length, postureScore: posture }); toast.success("Routine complete — lovely work!"); }
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const pose = POSES[i];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl">Seated Morning Stretch</h2>
        <p className="text-muted-foreground">Chair-based, low-impact. Stop anytime if anything feels uncomfortable.</p>
        <ol className="mt-4 space-y-2">
          {POSES.map((p, idx) => (
            <li key={p.name} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-lg", idx === i ? "bg-primary text-primary-foreground" : idx < i ? "opacity-50 line-through" : "")}>
              <span className="font-display">{idx + 1}</span>{p.name}
            </li>
          ))}
        </ol>
        {(i < 0 || i >= POSES.length) && (
          <button onClick={() => { done.current = 0; setI(0); }} className="mt-4 min-h-14 rounded-xl bg-primary px-8 text-xl font-bold text-primary-foreground">{i < 0 ? "Begin" : "Do it again"}</button>
        )}
        {i >= 0 && i < POSES.length && <button onClick={() => setI(POSES.length)} className="mt-4 min-h-12 rounded-xl border border-border px-6">Stop here</button>}
      </div>
      <div className="grid place-items-center rounded-2xl bg-secondary p-6 text-center">
        {pose ? (
          <div>
            <svg viewBox="0 0 120 160" className="mx-auto h-48 text-primary" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round">
              <circle cx="60" cy="25" r="14" />
              <line x1="60" y1="40" x2="60" y2="95" />
              <line x1="60" y1="55" x2={i === 3 ? 30 : 30} y2={i === 3 ? 20 : 80} className="transition-all" />
              <line x1="60" y1="55" x2={i === 3 ? 90 : 90} y2={i === 3 ? 20 : 80} className="transition-all" />
              <line x1="60" y1="95" x2="90" y2="100" /><line x1="90" y1="100" x2="90" y2={i === 5 ? 120 : 145} className="transition-all" />
              <line x1="60" y1="95" x2="30" y2="100" /><line x1="30" y1="100" x2="30" y2="145" />
              <line x1="20" y1="100" x2="100" y2="100" strokeWidth="3" className="text-muted-foreground" />
            </svg>
            <div className="mt-4 font-display text-3xl">{pose.name}</div>
            <p className="mt-2 text-xl">{pose.cue}</p>
            <div className="mt-4 font-display text-5xl">{left}s</div>
            <div className="mt-3 text-sm">Posture guidance: <b className={posture > 80 ? "text-success" : ""}>{posture > 80 ? "Lovely, upright posture" : "Try sitting a little taller"}</b> ({posture}%)</div>
          </div>
        ) : (
          <p className="text-xl text-muted-foreground">{i >= POSES.length ? "All done. Have a sip of water." : "Press Begin when you're comfortable in your chair."}</p>
        )}
      </div>
    </div>
  );
}
