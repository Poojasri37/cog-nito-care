import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Eye, Gamepad2, HeartHandshake, LayoutDashboard, Network, Pill, Users } from "lucide-react";
import { FAMILY, MEDICATIONS, PATIENT } from "@/lib/care-data";
import { today, useCare } from "@/lib/care-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareCompanion AI — Dementia care companion" },
      { name: "description", content: "Memory-augmented multimodal agentic AI companion for personalised dementia care, with caregiver dashboard and therapies." },
      { property: "og:title", content: "CareCompanion AI — Dementia care companion" },
      { property: "og:description", content: "Memory-augmented multimodal agentic AI companion for personalised dementia care." },
    ],
  }),
  component: Index,
});

const LOOP = ["Observe", "Understand context", "Retrieve memory", "Reason", "Select agent", "Act", "Observe outcome", "Update memory"];

const SCENARIOS = [
  { to: "/companion", q: "where-am-i", title: "Afternoon disorientation", body: "Maggie asks where she is. Companion reassures, orients, and alerts the caregiver.", icon: HeartHandshake },
  { to: "/perception", q: "sarah", title: "Daughter arrives", body: "Camera recognises Sarah; memory of last Sunday is surfaced to Maggie.", icon: Eye },
  { to: "/companion", q: "glasses", title: "Lost glasses", body: "Maggie can't find her glasses. Object memory guides her to the bedside table.", icon: Camera },
  { to: "/therapy", q: "", title: "Reminiscence session", body: "Wedding & Cornwall photos prompt gentle recall; responses become memories.", icon: Gamepad2 },
] as const;

function Index() {
  const { state } = useCare();
  const taken = MEDICATIONS.filter((m) => state.medsTaken[m.id] === today()).length;
  return (
    <div className="px-6 py-8 md:px-10">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Research prototype · Agentic AI</div>
          <h1 className="mt-3 text-4xl md:text-5xl leading-tight">
            A companion that <em className="text-primary">remembers</em>, so she doesn't have to.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            CareCompanion combines voice, vision, routines and a three-tier memory engine to support people living with dementia — and keeps caregivers in the loop.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/companion" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
              Open Patient Companion <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/caregiver" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-semibold hover:bg-secondary">
              <LayoutDashboard className="h-4 w-4" /> Caregiver Command Center
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-accent font-display text-2xl text-accent-foreground">MD</div>
            <div>
              <div className="font-display text-2xl">{PATIENT.name}, {PATIENT.age}</div>
              <div className="text-sm text-muted-foreground">{PATIENT.condition}</div>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Stat icon={Users} label="Family" value={FAMILY.length} />
            <Stat icon={Network} label="Memories" value={state.episodes.length + state.facts.length} />
            <Stat icon={Pill} label="Meds today" value={`${taken}/${MEDICATIONS.length}`} />
          </dl>
          <p className="mt-5 text-sm text-muted-foreground">Former {PATIENT.formerCareer.toLowerCase()}. Calmed by {PATIENT.calmingTopics.slice(0, 3).join(", ")}.</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">The central intelligence loop</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {LOOP.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`rounded-full px-4 py-2 text-sm font-semibold ${s.includes("memory") ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>{i + 1}. {s}</span>
              {i < LOOP.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Guided demo scenarios</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((s) => (
            <Link key={s.title} to={s.to} search={s.q ? ({ scenario: s.q } as never) : undefined} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary">
              <s.icon className="h-6 w-6 text-primary" />
              <div className="mt-3 font-display text-lg">{s.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Run scenario <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-1 font-display text-xl">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
