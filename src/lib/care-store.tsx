import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FAMILY,
  MEDICATIONS,
  OBJECTS,
  PATIENT,
  SEED_FACTS,
  seedAlerts,
  seedEpisodes,
  seedMovement,
  seedScores,
  type Alert,
  type ChatMessage,
  type Episode,
  type GameScore,
  type MemoryCategory,
  type MovementSession,
  type Note,
  type SemanticFact,
} from "./care-data";

type ShortTerm = {
  currentActivity: string;
  recentPerson: string | null;
  mood: "calm" | "content" | "anxious" | "confused";
  messages: ChatMessage[];
};

type CareState = {
  shortTerm: ShortTerm;
  episodes: Episode[];
  facts: SemanticFact[];
  alerts: Alert[];
  scores: GameScore[];
  movement: MovementSession[];
  notes: Note[];
  medsTaken: Record<string, string>; // medId -> date (YYYY-MM-DD)
  agentTrace: { id: string; step: string; detail: string; timestamp: number }[];
};

const KEY = "carecompanion-state-v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

function initial(): CareState {
  const now = Date.now();
  return {
    shortTerm: { currentActivity: "idle", recentPerson: null, mood: "calm", messages: [] },
    episodes: seedEpisodes(now),
    facts: SEED_FACTS,
    alerts: seedAlerts(now),
    scores: seedScores(now),
    movement: seedMovement(now),
    notes: [{ id: "n1", author: "Sarah (daughter)", text: "Mum was cheerful on Sunday. Loved talking about the Cornwall photos.", timestamp: now - 6 * 86400000 }],
    medsTaken: {},
    agentTrace: [],
  };
}

/* ---------- Memory formation pipeline (extraction → importance → store/ignore) ---------- */
export type MemoryCandidate = { category: MemoryCategory; type: string; description: string; person?: string; importance: number };

export function extractMemories(text: string): { candidates: MemoryCandidate[]; signals: { confusion: boolean; agitation: boolean; object?: string } } {
  const t = text.toLowerCase();
  const candidates: MemoryCandidate[] = [];
  const person = FAMILY.find((f) => t.includes(f.name.toLowerCase()));
  const confusion = /(where am i|what day|who are you|i don'?t know where|lost|where is arthur|confused|what year)/.test(t);
  const agitation = /(scared|frightened|angry|go home|leave me|help me|upset|afraid|worried)/.test(t);
  const obj = OBJECTS.find((o) => t.includes(o.name.toLowerCase().split(" ").pop()!));
  if (person) candidates.push({ category: "FAMILY_RELATIONSHIP", type: "mentioned_person", description: `Mentioned ${person.name}: "${text.slice(0, 90)}"`, person: person.name, importance: 0.7 });
  if (/(remember when|when i was|as a girl|used to|childhood|my father|my mother)/.test(t)) candidates.push({ category: "CONVERSATION_MEMORY", type: "childhood_memory", description: `Shared a memory: "${text.slice(0, 110)}"`, importance: 0.82 });
  if (/(i love|i like|my favourite|my favorite|i enjoy)/.test(t)) candidates.push({ category: "PREFERENCE", type: "preference", description: `Expressed a preference: "${text.slice(0, 100)}"`, importance: 0.75 });
  if (/(next week|tomorrow|on friday|birthday|play|appointment|coming to)/.test(t)) candidates.push({ category: "IMPORTANT_EVENT", type: "upcoming_event", description: `Mentioned an upcoming event: "${text.slice(0, 100)}"`, importance: 0.8 });
  if (obj) candidates.push({ category: "SAFETY_EVENT", type: "misplaced_object", description: `Looking for ${obj.name.toLowerCase()}.`, importance: 0.6 });
  if (confusion) candidates.push({ category: "SAFETY_EVENT", type: "confusion", description: `Showed signs of disorientation: "${text.slice(0, 90)}"`, importance: 0.9 });
  return { candidates: candidates.filter((c) => c.importance >= 0.55), signals: { confusion, agitation, object: obj?.name } };
}

/* ---------- Retrieval (keyword + recency + importance scoring, stands in for vector search) ---------- */
export function retrieve(state: CareState, query: string, k = 5) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const now = Date.now();
  const scoreText = (s: string) => words.reduce((a, w) => a + (s.toLowerCase().includes(w) ? 1 : 0), 0);
  const eps = state.episodes
    .map((e) => ({ e, s: scoreText(e.description + " " + (e.person ?? "")) * 1.5 + e.importance + Math.max(0, 1 - (now - e.timestamp) / (14 * 86400000)) * 0.5 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.e);
  const facts = state.facts
    .map((f) => ({ f, s: scoreText(`${f.subject} ${f.relation} ${f.object}`) + f.confidence * 0.2 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k + 3)
    .map((x) => x.f);
  return { episodes: eps, facts };
}

export function buildContext(state: CareState, query: string) {
  const { episodes, facts } = retrieve(state, query);
  const hour = new Date().getHours();
  const dueMeds = MEDICATIONS.filter((m) => state.medsTaken[m.id] !== today() && parseInt(m.time) <= hour);
  return {
    patient: PATIENT,
    now: new Date().toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
    shortTerm: { activity: state.shortTerm.currentActivity, recentPerson: state.shortTerm.recentPerson, mood: state.shortTerm.mood },
    family: FAMILY.map((f) => `${f.name} — ${f.relation}: ${f.facts.join("; ")}`),
    facts: facts.map((f) => `${f.subject} ${f.relation} ${f.object}`),
    episodes: episodes.map((e) => `[${new Date(e.timestamp).toLocaleDateString("en-GB", { weekday: "short" })}] ${e.description}`),
    dueMedications: dueMeds.map((m) => `${m.name} ${m.dose} at ${m.time} (${m.purpose})`),
    objects: OBJECTS.map((o) => `${o.name}: ${o.usual}`),
  };
}

/* ---------- Store ---------- */
type Ctx = {
  state: CareState;
  hydrated: boolean;
  addMessage: (role: ChatMessage["role"], text: string) => ChatMessage;
  updateMessage: (id: string, text: string) => void;
  clearConversation: () => void;
  addEpisode: (e: Omit<Episode, "id" | "timestamp">) => void;
  addAlert: (a: Omit<Alert, "id" | "timestamp" | "resolved">) => void;
  resolveAlert: (id: string) => void;
  addScore: (s: Omit<GameScore, "id" | "timestamp">) => void;
  addMovement: (m: Omit<MovementSession, "id" | "timestamp">) => void;
  addNote: (author: string, text: string) => void;
  takeMed: (id: string) => void;
  setShortTerm: (p: Partial<Omit<ShortTerm, "messages">>) => void;
  trace: (step: string, detail: string) => void;
  processUtterance: (text: string) => ReturnType<typeof extractMemories>;
  reset: () => void;
};

const CareContext = createContext<Ctx | null>(null);

export function CareProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CareState>(initial);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial(), ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const trace = useCallback((step: string, detail: string) => {
    setState((s) => ({ ...s, agentTrace: [{ id: uid(), step, detail, timestamp: Date.now() }, ...s.agentTrace].slice(0, 40) }));
  }, []);

  const addEpisode = useCallback((e: Omit<Episode, "id" | "timestamp">) => {
    setState((s) => ({ ...s, episodes: [{ ...e, id: uid(), timestamp: Date.now() }, ...s.episodes].slice(0, 200) }));
  }, []);
  const addAlert = useCallback((a: Omit<Alert, "id" | "timestamp" | "resolved">) => {
    setState((s) => ({ ...s, alerts: [{ ...a, id: uid(), timestamp: Date.now(), resolved: false }, ...s.alerts] }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      hydrated,
      trace,
      addEpisode,
      addAlert,
      addMessage: (role, text) => {
        const m = { id: uid(), role, text, timestamp: Date.now() };
        setState((s) => ({ ...s, shortTerm: { ...s.shortTerm, messages: [...s.shortTerm.messages, m].slice(-40) } }));
        return m;
      },
      updateMessage: (id, text) =>
        setState((s) => ({ ...s, shortTerm: { ...s.shortTerm, messages: s.shortTerm.messages.map((m) => (m.id === id ? { ...m, text } : m)) } })),
      clearConversation: () => setState((s) => ({ ...s, shortTerm: { ...s.shortTerm, messages: [] } })),
      resolveAlert: (id) => setState((s) => ({ ...s, alerts: s.alerts.map((a) => (a.id === id ? { ...a, resolved: true } : a)) })),
      addScore: (sc) => {
        setState((s) => ({ ...s, scores: [...s.scores, { ...sc, id: uid(), timestamp: Date.now() }] }));
        addEpisode({ category: "THERAPY_PROGRESS", type: `${sc.game}_game`, description: `Played ${sc.game} game — score ${sc.score}.`, importance: 0.55 });
      },
      addMovement: (m) => {
        setState((s) => ({ ...s, movement: [...s.movement, { ...m, id: uid(), timestamp: Date.now() }] }));
        addEpisode({ category: "YOGA_PROGRESS", type: "movement_session", description: `Completed ${m.routine}, ${m.completed}/${m.total} poses, posture ${m.postureScore}%.`, importance: 0.5 });
      },
      addNote: (author, text) => setState((s) => ({ ...s, notes: [{ id: uid(), author, text, timestamp: Date.now() }, ...s.notes] })),
      takeMed: (id) => {
        setState((s) => ({ ...s, medsTaken: { ...s.medsTaken, [id]: today() } }));
        const m = MEDICATIONS.find((x) => x.id === id);
        if (m) addEpisode({ category: "ROUTINE", type: "medication_taken", description: `Took ${m.name} ${m.dose}.`, importance: 0.45 });
      },
      setShortTerm: (p) => setState((s) => ({ ...s, shortTerm: { ...s.shortTerm, ...p } })),
      processUtterance: (text) => {
        const res = extractMemories(text);
        trace("Memory Extraction", `${res.candidates.length} candidate(s) kept after importance filter`);
        res.candidates.forEach((c) => addEpisode(c));
        if (res.signals.confusion) {
          addAlert({ level: "warning", kind: "confusion", message: `Possible disorientation: "${text.slice(0, 80)}"` });
          trace("SafetyAgent", "Confusion signal → caregiver alert raised");
        }
        if (res.signals.agitation) {
          addAlert({ level: "critical", kind: "agitation", message: `Distress language detected: "${text.slice(0, 80)}"` });
          trace("SafetyAgent", "Agitation signal → critical alert raised");
        }
        setState((s) => ({
          ...s,
          shortTerm: {
            ...s.shortTerm,
            currentActivity: "conversation",
            mood: res.signals.agitation ? "anxious" : res.signals.confusion ? "confused" : s.shortTerm.mood === "anxious" ? "calm" : s.shortTerm.mood,
            recentPerson: FAMILY.find((f) => text.toLowerCase().includes(f.name.toLowerCase()))?.name ?? s.shortTerm.recentPerson,
          },
        }));
        return res;
      },
      reset: () => setState(initial()),
    }),
    [state, hydrated, trace, addEpisode, addAlert],
  );

  return <CareContext.Provider value={value}>{children}</CareContext.Provider>;
}

export function useCare() {
  const c = useContext(CareContext);
  if (!c) throw new Error("useCare must be used within CareProvider");
  return c;
}

export { today };
