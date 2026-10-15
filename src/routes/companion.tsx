import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Gamepad2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { buildContext, today, useCare } from "@/lib/care-store";
import { mockReply, routeIntent, speak, streamCompanion } from "@/lib/companion-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/companion")({
  validateSearch: z.object({ scenario: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Patient Companion — CareCompanion AI" },
      {
        name: "description",
        content:
          "Calm, high-contrast voice companion for Margaret with reassurance loops and memory-aware conversation.",
      },
      { property: "og:title", content: "Patient Companion — CareCompanion AI" },
      {
        property: "og:description",
        content: "Calm, high-contrast voice companion with memory-aware conversation.",
      },
    ],
  }),
  component: Companion,
});

const SCENARIO_TEXT: Record<string, string> = {
  "where-am-i": "Where am I? I want to go home.",
  glasses: "I can't find my glasses anywhere.",
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}
type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }> & { isFinal?: boolean };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<SpeechRecognitionResultLike> }) => void;
  onerror: (e: { error?: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

function Companion() {
  const { state, addMessage, updateMessage, processUtterance, trace, takeMed, setShortTerm } =
    useCare();
  const { scenario } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [latestReply, setLatestReply] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const ranScenario = useRef(false);
  const msgs = state.shortTerm.messages;

  useEffect(() => {
    setShortTerm({ currentActivity: "companion" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setVoiceStatus("");
    setLatestReply("");
    trace("Input Processor", `Utterance received (${clean.length} chars)`);
    addMessage("user", clean);
    const res = processUtterance(clean);
    const agent = routeIntent(clean, res.signals, state.profile.family);
    trace("Intent Router", `Selected ${agent}`);
    const context = buildContext(state, clean);
    trace(
      "Memory Retriever",
      `${context.episodes.length} episodes, ${context.facts.length} facts retrieved`,
    );
    const history = [...msgs, { role: "user" as const, text: clean }]
      .slice(-12)
      .map((m) => ({ role: m.role, text: m.text }));
    const placeholder = addMessage("assistant", "");
    await new Promise((r) => setTimeout(r, 600));
    const out = await streamCompanion({ messages: history, context, agent }, (full) => {
      updateMessage(placeholder.id, full);
      setLatestReply(full);
    });
    let reply = out.text;
    if (out.source === "fallback") {
      reply = state.isDemo
        ? mockReply(clean, agent)
        : "I'm here with you. Thank you for telling me. What would you like to talk about?";
      updateMessage(placeholder.id, reply);
      setLatestReply(reply);
      if (out.error)
        setVoiceStatus(
          "The online companion is unavailable. Check the server AI key configuration.",
        );
      trace("Response Generator", `Deterministic fallback used (${out.error ?? "offline"})`);
    } else trace("Response Generator", "LLM response streamed");
    if (voiceOn) speak(reply);
    setBusy(false);
  }

  useEffect(() => {
    if (scenario && SCENARIO_TEXT[scenario] && !ranScenario.current) {
      ranScenario.current = true;
      setTimeout(() => send(SCENARIO_TEXT[scenario]), 500);
    }
  }, [scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopVoiceSession() {
    if (recRef.current) {
      recRef.current.stop();
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      return;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setListening(false);
  }

  function startBrowserSpeechRecognition() {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return false;

    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = true;
    rec.continuous = true;
    let finalTranscript = "";
    let recognitionFailed = false;

    rec.onresult = (event) => {
      const finalParts: string[] = [];
      const interimParts: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript) continue;
        if (result.isFinal) finalParts.push(transcript);
        else interimParts.push(transcript);
      }
      finalTranscript = finalParts.join(" ");
      setLiveTranscript([finalTranscript, interimParts.join(" ")].filter(Boolean).join(" "));
    };
    rec.onerror = (event) => {
      recognitionFailed = true;
      const messages: Record<string, string> = {
        "not-allowed":
          "Microphone permission was denied. Allow microphone access in browser settings and try again.",
        "audio-capture": "No microphone was found. Connect or enable a microphone and try again.",
        network: "Browser speech recognition needs a network connection. Try again when connected.",
        "no-speech": "I didn't hear speech. Please try again after pressing the microphone.",
      };
      setVoiceStatus(
        messages[event.error ?? ""] ??
          "Speech recognition failed. Please try the microphone again.",
      );
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      if (recognitionFailed) return;
      if (finalTranscript.trim()) {
        setLiveTranscript(finalTranscript.trim());
        void send(finalTranscript);
      } else {
        setLiveTranscript("");
        setVoiceStatus("I didn't catch that. Please try speaking again.");
      }
    };
    recRef.current = rec;
    setLiveTranscript("");
    setVoiceStatus("Listening — your words will appear here as you speak.");
    setListening(true);
    try {
      rec.start();
      return true;
    } catch (error) {
      console.error("Browser speech recognition could not start.", error);
      recRef.current = null;
      setListening(false);
      setVoiceStatus(
        "Speech recognition could not start. Check microphone permission and try again.",
      );
      return false;
    }
  }

  async function transcribeRecordedAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      setListening(false);
      const blob = new Blob(chunks, { type: mimeType || "application/octet-stream" });
      if (!blob.size) {
        setVoiceStatus("I didn't receive any audio. Please try the microphone again.");
        return;
      }
      setVoiceStatus("Transcribing your recording…");
      const file = new File([blob], "voice-input.webm", { type: blob.type });
      const formData = new FormData();
      formData.append("audio", file, "voice-input.webm");

      try {
        const res = await fetch("/api/voice/transcribe", { method: "POST", body: formData });
        const payload = (await res.json().catch(() => null)) as {
          text?: string;
          note?: string;
          error?: string;
        } | null;
        if (res.ok) {
          if (payload?.text) {
            setLiveTranscript(payload.text);
            await send(payload.text);
            return;
          }
        }
        setVoiceStatus(
          payload?.error ?? "The audio transcription service could not process this recording.",
        );
      } catch (error) {
        console.error("Local voice transcription request failed.", error);
        setVoiceStatus("Audio transcription could not be reached.");
      }
    };

    mediaStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    setListening(true);
    setVoiceStatus("Listening. Your recording will be transcribed when you finish.");
    recorder.start();
  }

  function toggleMic() {
    if (listening) {
      stopVoiceSession();
      return;
    }
    setVoiceStatus("");
    setLatestReply("");
    window.speechSynthesis?.cancel();
    if (startBrowserSpeechRecognition()) return;
    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      void transcribeRecordedAudio().catch((error: unknown) => {
        console.error("Microphone recording could not start.", error);
        setListening(false);
        setVoiceStatus(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Microphone permission was denied. Allow access in browser settings and try again."
            : "Microphone recording could not start. Check microphone permission and try again.",
        );
      });
      return;
    }
    setVoiceStatus(
      "Voice input is not supported here. Open this page in Chrome or Edge and allow microphone access.",
    );
  }

  const hour = new Date().getHours();
  const nextMed = state.profile.medications.find(
    (m) => state.medsTaken[m.id] !== today() && parseInt(m.time) <= hour + 1,
  );

  return (
    <div className="min-h-screen bg-[#f0f9fc] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 md:px-12">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-1 font-sans text-3xl font-bold md:text-4xl">
              Hi, {state.profile.patient.preferredName}
            </h1>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setVoiceOn((enabled) => !enabled);
                window.speechSynthesis?.cancel();
              }}
              aria-label={voiceOn ? "Mute spoken replies" : "Enable spoken replies"}
              title={voiceOn ? "Mute spoken replies" : "Enable spoken replies"}
              className="grid h-11 w-11 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800"
            >
              {voiceOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            <Link
              to="/account"
              className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-800"
            >
              switch user
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-4">
          <section
            className="mb-4 min-h-16 w-full max-w-3xl text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            {liveTranscript && (
              <p className="text-xl leading-relaxed text-slate-600 md:text-2xl">{liveTranscript}</p>
            )}
            {latestReply && (
              <p className="mt-4 text-2xl font-medium leading-relaxed text-slate-800 md:text-3xl">
                {latestReply}
              </p>
            )}
            {!liveTranscript && !latestReply && !busy && (
              <p className="text-xl text-slate-500">I'm here with you.</p>
            )}
            {busy && <p className="text-xl text-slate-500">I'm thinking of what to say…</p>}
          </section>

          <div className="flex items-center justify-center gap-4 sm:gap-7">
            <Link
              to="/perception"
              aria-label="Open camera"
              title="Camera"
              className="grid h-16 w-16 place-items-center rounded-full bg-white text-slate-700 shadow-[0_8px_18px_rgba(39,73,86,0.14)] transition hover:-translate-y-0.5 hover:shadow-lg sm:h-20 sm:w-20"
            >
              <Camera className="h-7 w-7 sm:h-8 sm:w-8" />
            </Link>
            <button
              type="button"
              onClick={toggleMic}
              disabled={busy}
              aria-label={listening ? "Finish speaking" : "Start speaking"}
              aria-pressed={listening}
              className={cn(
                "grid h-40 w-40 place-items-center rounded-full text-white shadow-[0_18px_34px_rgba(31,83,89,0.24)] transition hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-teal-700 disabled:cursor-wait disabled:opacity-70 sm:h-48 sm:w-48",
                listening ? "animate-pulse bg-rose-500" : "bg-[#009b8d]",
              )}
            >
              {listening ? (
                <MicOff className="h-14 w-14 sm:h-16 sm:w-16" />
              ) : (
                <Mic className="h-14 w-14 sm:h-16 sm:w-16" />
              )}
            </button>
            <Link
              to="/therapy"
              aria-label="Open games"
              title="Games"
              className="grid h-16 w-16 place-items-center rounded-full bg-white text-slate-700 shadow-[0_8px_18px_rgba(39,73,86,0.14)] transition hover:-translate-y-0.5 hover:shadow-lg sm:h-20 sm:w-20"
            >
              <Gamepad2 className="h-7 w-7 sm:h-8 sm:w-8" />
            </Link>
          </div>

          <p className="mt-4 min-h-7 text-center text-base text-slate-500 sm:mt-7" role="status">
            {busy
              ? "Your companion is replying…"
              : listening
                ? "Tap the microphone again when you're finished."
                : voiceStatus || "Tap the microphone to talk. Tap again when you're finished."}
          </p>
        </main>

        {nextMed && (
          <div className="mx-auto mb-2 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 px-5 py-4 text-slate-700 shadow-sm">
            <p className="text-lg">
              It's time for <strong>{nextMed.name}</strong> {nextMed.dose}
              {nextMed.withFood ? ", with some food" : ""}.
            </p>
            <button
              type="button"
              onClick={() => takeMed(nextMed.id)}
              className="min-h-11 rounded-xl bg-[#009b8d] px-5 font-bold text-white hover:bg-[#00877b]"
            >
              I've taken it
            </button>
          </div>
        )}
        {state.profile.patient.home && (
          <p className="text-center text-sm text-slate-400">
            You're at home in {state.profile.patient.home}
          </p>
        )}
      </div>
    </div>
  );
}
