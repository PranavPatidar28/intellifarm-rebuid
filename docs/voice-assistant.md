# IntelliFarm Live Voice Assistant

## Runtime

The mobile voice path uses `@speechmatics/expo-two-way-audio` for native PCM microphone capture and playback. Expo Go is not a supported runtime for this feature. Use a custom Expo development client or a production build on a real iOS or Android device.

Android requires `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS`. iOS requires `NSMicrophoneUsageDescription`. These permissions are declared in `apps/mobile/app.json`.

## Environment

Set these backend variables before using live voice:

```env
GEMINI_API_KEY=
GEMINI_LIVE_MODEL=gemini-live-2.5-flash-preview
GEMINI_LIVE_VOICE_NAME=Aoede
VOICE_SESSION_TICKET_SECRET=replace-with-a-long-random-string
VOICE_SESSION_TICKET_TTL_SECONDS=120
VOICE_RECONNECT_GRACE_SECONDS=20
VOICE_MAX_CONCURRENT_SESSIONS_PER_USER=1
VOICE_RATE_LIMIT_PER_MINUTE=6
VOICE_MAX_AUDIO_CHUNK_BYTES=98304
```

Run the Prisma migration and regenerate the client after pulling this change:

```bash
pnpm --filter @intellifarm/api db:migrate
pnpm --filter @intellifarm/api db:generate
```

## Session Flow

1. The mobile app calls `POST /v1/assistant/voice/sessions` with the active farm or season context.
2. The backend authenticates the JWT, validates the requested farm context, creates an in-memory voice session, and returns a short-lived signed ticket.
3. The mobile app connects to `/voice?ticket=...` and streams 16 kHz mono PCM chunks as `input.audio`.
4. The backend opens a Gemini Live session with audio output, input/output transcription, session resumption, and the shared IntelliFarm tool registry.
5. Gemini streamed audio returns as `audio.output`; finalized transcripts are appended to the existing assistant conversation history.

## Tool Calls

Voice and text chat share the same `AssistantToolRegistryService`. The required live tools are registered with Zod validation, Gemini JSON schemas, structured result envelopes, and server-side ownership checks:

`getFarmerProfile`, `getFarmDetails`, `getWeather`, `getSoilSensorData`, `getCropRecommendation`, `detectCropDisease`, `getMarketRates`, `turnPumpOn`, `turnPumpOff`, `getIrrigationStatus`, `getPreviousAlerts`, and `logFarmerQuery`.

Missing live data is returned as structured `unavailable` or `requiresImages` output. The assistant is instructed to explain the next useful step instead of inventing values.

## Device Confirmation

Pump control is two-step. A Gemini call to `turnPumpOn` or `turnPumpOff` creates a pending confirmation and emits `action.confirmation_required`; it does not control the device. The backend executes the pump command only after the authenticated socket sends `action.confirm` for that pending action.

## Failure Modes

If the native voice module is unavailable, microphone permission is denied, the socket drops, or Gemini fails, the mobile app keeps the text/image assistant usable. Reconnects reuse the backend voice session while it is inside the configured reconnect grace window. Raw audio is never stored; only transcripts, summaries, tool usage, and error metadata are persisted in `AssistantInteractionLog`.

## Verification

Automated backend coverage should focus on voice session creation auth, ticket expiry, WebSocket lifecycle, malformed events, tool routing, invalid parameters, Gemini event mapping, rate limits, and the pump confirmation flow. Mobile QA should cover permission granted/denied states, tap-to-talk transitions, reconnect after socket drop, transcript appending, Gemini/network fallback, and audio interruption when the farmer starts a new turn.

Manual real-device QA is required on Android and iOS custom builds for English, Hindi, and Hinglish turns, plus weather, market, sensor, crop recommendation, disease-image, and pump confirmation/cancel scenarios.
