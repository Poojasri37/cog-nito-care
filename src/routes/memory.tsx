import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { retrieve, useCare } from "@/lib/care-store";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memory Engine — CareCompanion AI" },
      { name: "description", content: "Short-term context, episodic memory log and long-term knowledge graph." },
      { property: "og:title", content: "Memory Engine — CareCompanion AI" },
      { property: "og:description", content: "Three-tier memory and context engine for dementia care." },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const { state, reset } = useCare();
  const [q, setQ] = useState("Sarah visit");
  const hits = retrieve(state, q);
  const st = state.shortTerm;
  return (
    <div>
      <PageHeader eyebrow="Central nervous system" title="Memory & Context Engine">
        <button onClick={reset} className="rounded-xl border border-border px-4 py-2 text-sm">Reset demo data</button>
      </PageHeader>
      <div className="grid gap-6 px-6 py-6 md:px-10 xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl">Short-term context</h2>
          <pre className="mt-3 overflow-auto rounded-xl bg-secondary p-3 text-xs">{JSON.stringify({ current_activity: st.currentActivity, recent_person: st.recentPerson, mood: st.mood, recent_messages: st.messages.length }, null, 2)}</pre>
          <h3 className="mt-5 font-semibold">Agent trace</h3>
          <ul className="mt-2 max-h-72 space-y-1 overflow-auto text-sm">
            {state.agentTrace.length === 0 && <li className="text-muted-foreground">Talk to the companion to see the agent graph run.</li>}
            {state.agentTrace.map((t) => <li key={t.id}><b className="text-primary">{t.step}</b> — {t.detail}</li>)}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl">Episodic memory</h2>
          <ul className="mt-3 max-h-[32rem] space-y-2 overflow-auto">
            {[...state.episodes].sort((a, b) => b.timestamp - a.timestamp).map((e) => (
              <li key={e.id} className="rounded-xl bg-secondary p-3 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground"><span>{e.category}</span><span>imp {e.importance.toFixed(2)} · {new Date(e.timestamp).toLocaleDateString("en-GB")}</span></div>
                {e.description}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl">Long-term knowledge graph</h2>
          <svg viewBox="0 0 300 220" className="mt-3 w-full">
            {state.profile.family.map((f, i) => {
              const a = (i / Math.max(1, state.profile.family.length)) * Math.PI * 2;
              const x = 150 + Math.cos(a) * 95, y = 110 + Math.sin(a) * 80;
              return (
                <g key={f.id}>
                  <line x1="150" y1="110" x2={x} y2={y} stroke="var(--border)" strokeWidth="2" />
                  <circle cx={x} cy={y} r="18" fill={`oklch(0.55 0.1 ${f.hue})`} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill="white">{f.name}</text>
                </g>
              );
            })}
            <circle cx="150" cy="110" r="26" fill="var(--primary)" />
            <text x="150" y="114" textAnchor="middle" fontSize="11" fill="var(--primary-foreground)">{state.profile.patient.preferredName}</text>
          </svg>
          <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-sm">
            {state.facts.map((f) => <li key={f.id}>{f.subject} <i className="text-muted-foreground">{f.relation}</i> <b>{f.object}</b></li>)}
          </ul>
          <h3 className="mt-5 font-semibold">Retrieval playground</h3>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2" />
          <ul className="mt-2 space-y-1 text-sm">{hits.episodes.slice(0, 3).map((e) => <li key={e.id}>• {e.description}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}
