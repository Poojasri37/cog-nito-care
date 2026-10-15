import { createFileRoute } from "@tanstack/react-router";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData().catch(() => null);
        const file = formData?.get("audio");
        if (!(file instanceof File)) {
          return Response.json({ error: "Upload an audio file in the 'audio' field." }, { status: 400 });
        }
        if (!file.size) return Response.json({ error: "The audio recording was empty." }, { status: 400 });
        if (file.size > MAX_AUDIO_BYTES) {
          return Response.json({ error: "Audio recording is too large (maximum 10 MB)." }, { status: 413 });
        }

        const apiKey = process.env["OPENROUTER_API_KEY"];
        if (!apiKey) {
          return Response.json({
            error: "OpenRouter transcription is not configured. Set OPENROUTER_API_KEY on the server.",
            fallback: "browser-speech-recognition",
          }, { status: 503 });
        }

        const audioFormat = (file.type.split("/")[1] ?? "webm").split(";")[0];
        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env["OPENROUTER_SITE_URL"] ?? "http://localhost:8080",
            "X-OpenRouter-Title": "CareCompanion voice transcription",
          },
          body: JSON.stringify({
            model: process.env["OPENROUTER_AUDIO_MODEL"] ?? "google/gemini-2.5-flash",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: "Transcribe the spoken words exactly. Return only the transcription, with no commentary." },
                {
                  type: "input_audio",
                  input_audio: {
                    data: Buffer.from(await file.arrayBuffer()).toString("base64"),
                    format: audioFormat,
                  },
                },
              ],
            }],
            stream: false,
          }),
        });

        if (!upstream.ok) {
          const details = await upstream.text();
          console.error(`OpenRouter transcription failed (${upstream.status}): ${details.slice(0, 1000)}`);
          return Response.json({
            error: "The audio transcription service could not process this recording.",
            fallback: "browser-speech-recognition",
          }, { status: 502 });
        }

        const response = await upstream.json() as {
          choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
        };
        const content = response.choices?.[0]?.message?.content;
        const text = typeof content === "string"
          ? content.trim()
          : Array.isArray(content)
            ? content.map((part) => part.text ?? "").join(" ").trim()
            : "";
        if (!text) {
          return Response.json({ error: "The transcription service returned no speech text." }, { status: 502 });
        }
        return Response.json({ text, language: "en" });
      },
    },
  },
});
