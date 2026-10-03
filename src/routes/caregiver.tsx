import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Check, HeartPulse } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { MEDICATIONS, ROUTINE } from "@/lib/care-data";
import { today, useCare } from "@/lib/care-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/caregiver")({
  head: () => ({
    meta: [
      { title: "Caregiver Command Center — CareCompanion AI" },
      { name: "description", content: "Live telemetry, cognitive analytics, routine adherence, safety alerts and session notes." },
      { property: "og:title", content: "Caregiver Command Center — CareCompanion AI" },
      { property: "og:description", content: "Live telemetry, cognitive analytics and safety alerts for caregivers." },
    ],
  }),
  component: Caregiver,
});

function Caregiver() {
  const { state, resolveAlert, addNote, takeMed, addAlert } = useCare();
  const [hr, setHr] = useState<number[]>([]);
  const [note, setNote] = useState("");
  useEffect(() => {
    const t = setInterval(() => setHr((h) => [...h.slice(-29), Math.round(72 + Math.sin(Date.now() / 5000) * 5 + Math.random() * 4)]), 1000);
    return () => clearInterval(t);
  }, []);
  const hour = new Date().getHours();
  const days: Record<string, Record<string, number>> = {};
  state.scores.forEach((s) => {
    const d = new Date(s.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    (days[d] ??= {})[s.game] = s.score;
  });
  const chart = Object.entries(days).map(([day, v]) => ({ day, ...v }));
  const open = state.alerts.filter((a) => !a.resolved);
  const avg = (g: string) => { const x = state.scores.filter((s) => s.game === g).slice(-5); return x.length ? Math.round(x.reduce((a, b) => a + b.score, 0) / x.length) : 0; };

  function checkMissed() {
    MEDICATIONS.filter((m) => parseInt(m.time) < hour && state.medsTaken[m.id] !== today()).forEach((m) =>
      addAlert({ level: "warning", kind: "missed_medication", message: `${m.name} ${m.dose} (due ${m.time}) not confirmed.` }));
  }

  return (
    <div>
      <PageHeader eyebrow="Caregiver" title="Command Center">
        <button onClick={checkMissed} className="rounded-xl border border-border px-4 py-2 text-sm">Run medication check</button>
      </PageHeader>
      <div className="grid gap-6 px-6 py-6 md:px-10 xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-xl"><HeartPulse className="h-5 w-5 text-destructive" /> Live telemetry</h2>
          <div className="mt-2 font-display text-4xl">{hr[hr.length - 1] ?? "—"} <span className="text-base text-muted-foreground">bpm (simulated)</span></div>
          <div className="mt-2 flex h-16 items-end gap-[2px]">{hr.map((v, i) => <div key={i} className="flex-1 rounded-t bg-destructive/60" style={{ height: `${(v - 60) * 4}%` }} />)}</div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-secondary p-3">Activity<br /><b>{state.shortTerm.currentActivity}</b></div>
            <div className="rounded-xl bg-secondary p-3">Mood<br /><b>{state.shortTerm.mood}</b></div>
            <div className="rounded-xl bg-secondary p-3">Last person<br /><b>{state.shortTerm.recentPerson ?? "—"}</b></div>
            <div className="rounded-xl bg-secondary p-3">Open alerts<br /><b>{open.length}</b></div>
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <h2 className="text-xl">Cognitive performance (14 days)</h2>
          <div className="mt-2 flex gap-4 text-sm">{["pattern", "words", "tiles", "reminiscence"].map((g) => <span key={g}>{g}: <b>{avg(g)}</b></span>)}</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis dataKey="day" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip />
                <Line dataKey="pattern" stroke="var(--chart-1)" connectNulls strokeWidth={2} />
                <Line dataKey="words" stroke="var(--chart-2)" connectNulls strokeWidth={2} />
                <Line dataKey="tiles" stroke="var(--chart-3)" connectNulls strokeWidth={2} />
                <Line dataKey="reminiscence" stroke="var(--chart-4)" connectNulls strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-xl"><AlertTriangle className="h-5 w-5 text-warning" /> Safety alerts</h2>
          <ul className="mt-3 max-h-80 space-y-2 overflow-auto">
            {state.alerts.map((a) => (
              <li key={a.id} className={cn("rounded-xl border-l-4 bg-secondary p-3 text-sm", a.level === "critical" ? "border-destructive" : a.level === "warning" ? "border-warning" : "border-primary", a.resolved && "opacity-50")}>
                <div className="text-xs text-muted-foreground">{a.kind} · {new Date(a.timestamp).toLocaleString("en-GB")}</div>
                {a.message}
                {!a.resolved && <button onClick={() => resolveAlert(a.id)} className="ml-2 font-semibold text-primary underline">Resolve</button>}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl">Today's routine & medication</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {MEDICATIONS.map((m) => {
              const ok = state.medsTaken[m.id] === today();
              return (
                <li key={m.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                  <span>{m.time} · {m.name} {m.dose}</span>
                  {ok ? <Check className="h-4 w-4 text-success" /> : <button onClick={() => takeMed(m.id)} className="text-xs font-semibold text-primary underline">Mark taken</button>}
                </li>
              );
            })}
          </ul>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {ROUTINE.map((r) => <li key={r.time} className={parseInt(r.time) <= hour ? "line-through" : ""}>{r.time} {r.label}</li>)}
          </ul>
          <div className="mt-3 text-sm">Movement sessions: <b>{state.movement.length}</b>, latest posture {state.movement[state.movement.length - 1]?.postureScore ?? "—"}%</div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl">Session notes</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) { addNote("Caregiver", note.trim()); setNote(""); } }} className="mt-3 flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="flex-1 rounded-xl border border-border bg-background px-3 py-2" />
            <button className="rounded-xl bg-primary px-4 text-primary-foreground">Add</button>
          </form>
          <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
            {state.notes.map((n) => <li key={n.id} className="rounded-xl bg-secondary p-3"><div className="text-xs text-muted-foreground">{n.author} · {new Date(n.timestamp).toLocaleString("en-GB")}</div>{n.text}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
