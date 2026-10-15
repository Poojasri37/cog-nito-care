import { createFileRoute } from "@tanstack/react-router";
import { Camera, CameraOff, Eye, Search, Activity, ScanFace } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import type { FamilyMember } from "@/lib/care-data";
import { useCare } from "@/lib/care-store";
import { speak } from "@/lib/companion-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/perception")({
  validateSearch: z.object({ scenario: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Multimodal Perception — CareCompanion AI" },
      { name: "description", content: "In-browser camera perception: family recognition, object finding and gentle movement tracking." },
      { property: "og:title", content: "Multimodal Perception — CareCompanion AI" },
      { property: "og:description", content: "Family recognition, object finding and movement tracking in the browser." },
    ],
  }),
  component: Perception,
});

type Mode = "demo" | "live";

function Perception() {
  const { state, addEpisode, addAlert, setShortTerm, trace } = useCare();
  const family = state.profile.family;
  const objects = state.profile.objects;
  const { scenario } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("demo");
  const [streamOn, setStreamOn] = useState(false);
  const [person, setPerson] = useState<FamilyMember | null>(null);
  const [scanning, setScanning] = useState(false);
  const [motion, setMotion] = useState<number[]>([]);
  const [objectHit, setObjectHit] = useState<(typeof objects)[number] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrame = useRef<Uint8ClampedArray | null>(null);
  const stillSince = useRef<number>(Date.now());

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);
  useEffect(() => {
    if (state.isDemo && scenario === "sarah") {
      const sarah = family.find((f) => f.id === "sarah");
      if (sarah) setTimeout(() => recognise(sarah), 400);
    }
  }, [scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setStreamOn(true);
      setMode("live");
      trace("VisionAgent", "Camera stream started");
    } catch {
      toast.error("Camera not available — staying in demo mode.");
      setMode("demo");
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStreamOn(false);
  }

  // Real in-browser motion estimation via frame differencing
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const v = videoRef.current, c = canvasRef.current;
      if (t - last < 250) return;
      last = t;
      let level: number;
      if (streamOn && v && c && v.readyState >= 2) {
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(v, 0, 0, 64, 48);
        const d = ctx.getImageData(0, 0, 64, 48).data;
        let diff = 0;
        if (prevFrame.current) for (let i = 0; i < d.length; i += 4) diff += Math.abs(d[i] - prevFrame.current[i]);
        prevFrame.current = new Uint8ClampedArray(d);
        level = Math.min(100, diff / 800);
      } else {
        level = Math.max(0, 18 + Math.sin(t / 900) * 12 + Math.random() * 8);
      }
      if (level > 8) stillSince.current = Date.now();
      setMotion((m) => [...m.slice(-59), level]);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [streamOn]);

  function recognise(f: FamilyMember) {
    setScanning(true);
    setPerson(null);
    trace("VisionAgent", "Face embedding computed, matching enrolled family gallery");
    setTimeout(() => {
      setScanning(false);
      setPerson(f);
      setShortTerm({ recentPerson: f.name });
      const last = [...state.episodes].filter((e) => e.person === f.name).sort((a, b) => b.timestamp - a.timestamp)[0];
      const line = `Maggie, ${f.name} is here — your ${f.relation.toLowerCase()}.${last ? ` Last time, ${last.description.charAt(0).toLowerCase() + last.description.slice(1)}` : ""}`;
      speak(line);
      addEpisode({ category: "IMPORTANT_EVENT", type: "family_visit", person: f.name, description: `${f.name} (${f.relation}) recognised by camera.`, importance: 0.9 });
      trace("MemoryAgent", `Surfaced last episode with ${f.name}`);
    }, 1400);
  }

  function unknownVisitor() {
    setScanning(true);
    setPerson(null);
    setTimeout(() => {
      setScanning(false);
      addAlert({ level: "warning", kind: "other", message: "Unrecognised person detected at front door camera." });
      toast.warning("Unknown visitor — caregiver notified");
      trace("SafetyAgent", "Unknown face → caregiver alert");
    }, 1400);
  }

  function findObject(o: (typeof objects)[number]) {
    setObjectHit(o);
    speak(`Your ${o.name.toLowerCase()} are usually ${o.usual.toLowerCase()}.`);
    addEpisode({ category: "SAFETY_EVENT", type: "object_search", description: `Helped find ${o.name.toLowerCase()} (${o.usual}).`, importance: 0.55 });
    trace("VisionAgent", `Object memory lookup: ${o.name}`);
  }

  const current = motion[motion.length - 1] ?? 0;
  const activity = current > 40 ? "Active movement" : current > 8 ? "Gentle movement" : "Resting / still";

  return (
    <div>
      <PageHeader eyebrow="Vision pipeline" title="Multimodal Perception">
        <div className="flex gap-2">
          {streamOn ? (
            <button onClick={stopCamera} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 font-semibold"><CameraOff className="h-4 w-4" /> Stop camera</button>
          ) : (
            <button onClick={startCamera} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground"><Camera className="h-4 w-4" /> Use my camera</button>
          )}
        </div>
        {!objects.length && <p className="mt-3 text-sm text-muted-foreground">No object locations are saved in this new profile yet.</p>}
      </PageHeader>
      <div className="grid gap-6 px-6 py-6 md:px-10 xl:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sidebar">
            <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover -scale-x-100", !streamOn && "hidden")} />
            {!streamOn && (
              <div className="absolute inset-0 grid place-items-center text-sidebar-foreground">
                <div className="text-center">
                  <Eye className="mx-auto h-10 w-10 opacity-60" />
                  <div className="mt-2 font-display text-xl">Simulated living-room camera</div>
                  <div className="text-sm opacity-60">Demo mode — pick a scenario on the right</div>
                </div>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-[22%] rounded-2xl border-4 border-accent animate-pulse">
                <div className="absolute -top-8 left-0 rounded bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">Scanning face…</div>
              </div>
            )}
            {person && (
              <div className="absolute inset-[22%] rounded-2xl border-4 border-success">
                <div className="absolute -top-9 left-0 rounded bg-success px-3 py-1 text-sm font-bold text-primary-foreground">{person.name} · {person.relation} · 94%</div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 rounded-lg bg-background/85 px-3 py-1.5 text-xs font-semibold">
              {mode === "live" ? "LIVE" : "DEMO"} · {activity}
            </div>
            <canvas ref={canvasRef} width={64} height={48} className="hidden" />
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Movement signal {streamOn ? "(frame differencing, in-browser)" : "(simulated)"}</div>
            <div className="mt-3 flex h-20 items-end gap-[2px]">
              {motion.map((m, i) => <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(3, m)}%` }} />)}
            </div>
            <button
              onClick={() => { addAlert({ level: "critical", kind: "fall_risk", message: "Sudden large movement followed by stillness — possible fall." }); toast.error("Possible fall — caregiver alerted"); trace("SafetyAgent", "Fall-risk pattern detected"); }}
              className="mt-3 text-sm font-semibold text-destructive underline"
            >Simulate fall-risk pattern</button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl"><ScanFace className="h-5 w-5 text-primary" /> Family recognition</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enrolled gallery of {family.length} faces.{state.isDemo ? " Demo simulates who walks into frame." : ""}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {family.filter((f) => f.id !== "arthur").map((f) => (
                <button key={f.id} onClick={() => recognise(f)} className="flex items-center gap-2 rounded-xl border border-border p-2 text-left hover:border-primary">
                  <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-primary-foreground" style={{ background: `oklch(0.55 0.1 ${f.hue})` }}>{f.initials}</span>
                  <span className="text-sm"><b>{f.name}</b><br /><span className="text-muted-foreground">{f.relation}</span></span>
                </button>
              ))}
              {state.isDemo && <button onClick={unknownVisitor} className="rounded-xl border border-dashed border-border p-2 text-sm hover:border-destructive">Unknown visitor</button>}
            </div>
            {!family.length && <p className="mt-3 text-sm text-muted-foreground">No people are enrolled in this new profile yet.</p>}
            {person && (
              <div className="mt-4 rounded-xl bg-secondary p-3 text-sm">
                <b>Memory surfaced:</b>
                <ul className="mt-1 list-disc pl-5">{person.facts.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-xl"><Search className="h-5 w-5 text-primary" /> Object finder</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {objects.map((o) => (
                <button key={o.name} onClick={() => findObject(o)} className={cn("rounded-full border px-3 py-1.5 text-sm", objectHit?.name === o.name ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{o.name}</button>
              ))}
            </div>
            {objectHit && <p className="mt-3 rounded-xl bg-accent/25 p-3 text-lg">Your <b>{objectHit.name.toLowerCase()}</b>: {objectHit.usual}.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
