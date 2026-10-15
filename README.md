# CareCompanion AI

Build CareCompanion AI: a Memory-Augmented Multimodal Agentic AI Companion for Dementia Care as specified in the attached document, using Lovable's full-stack architecture.

Key modules and requirements:
1. Multi-tier Memory & Context Engine (short-term conversational context, episodic memory logs, and long-term semantic knowledge graph for family, preferences, medication routines, and triggers).
2. Patient Companion Mode: calming, accessible, high-contrast, large-touch UI with real-time voice interaction, compassionate pacing, and reassurance loops.
3. Multimodal Perception: camera feed with face recognition / family member identification, object finding, and gentle movement/pose tracking (using in-browser vision and simulated demo camera modes).
4. Interactive Therapies: Reminiscence Therapy with family photo albums and prompt-driven memory recall; Cognitive stimulation games (pattern recall, word association, memory tiles); and an AI gentle movement / yoga coach with posture guidance.
5. Caregiver Command Center: live telemetry dashboard, cognitive performance analytics, routine adherence tracking, safety alerts (confusion, missed medication, agitation flags), and session notes.
6. Pre-seeded demo persona (Margaret Dawson, 76, mild-to-moderate Alzheimer's) with family history, medication schedule, memory milestones, and interactive end-to-end demo scenarios.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cog-nito-care.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5827cb0c-6649-48f7-9835-71f1f51d54f2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Local accounts and AI

Use `/account` to create a browser-local patient or caregiver account, or choose Demo mode to return to the pre-seeded Margaret Dawson demo. New accounts start with an empty memory, family list, and medication list. A caregiver can be linked to a patient using the patient care code when both accounts are created in the same browser. Account credentials and care data are stored in that browser only; there is no server-side account storage or cross-device sync.

To enable OpenRouter-backed companion replies and audio transcription, set `OPENROUTER_API_KEY` in the server environment (for a local PowerShell session: `$env:OPENROUTER_API_KEY="your-private-key"; npm run dev`). The key is used only by server routes and must not be placed in client code or committed. `OPENROUTER_MODEL` and `OPENROUTER_AUDIO_MODEL` can be set to models enabled for the key. Without an OpenRouter key, the existing Lovable AI gateway is used for companion replies when configured.

Voice input records microphone audio and submits it to `/api/voice/transcribe` for OpenRouter transcription; if server transcription is unavailable, browser SpeechRecognition is tried as a fallback (Chrome/Edge are recommended). The remote audio model may incur charges and audio is sent to that provider. The companion reports microphone permission and transcription failures instead of silently pretending speech was captured.
