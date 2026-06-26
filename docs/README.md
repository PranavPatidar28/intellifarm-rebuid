# Intellifarm Documentation

Presentation assets, specs, and diagrams for the Intellifarm platform. See the [root README](../README.md) for setup and the [development guide](../CLAUDE.md) for conventions.

## User flow & pitch

- **[User flow diagram](./userflow-diagram.md)** — the implemented app flow (Mermaid)
- **[Hackathon presentation](./userflow-hackathon.html)** — narrated walkthrough
- **[Single-slide pitch](./userflow-pitch-slide.html)** — one-slide summary
- **[Swimlane diagram](./userflow-swimlane.html)** — judge-friendly role swimlanes
- **[Poster](./userflow-poster.html)** — poster-style overview

Rendered exports (SVG/PNG) live in [`exports/`](./exports).

## Technical specs

- **[Voice assistant](./voice-assistant.md)** — the live voice + pump-confirmation flow (Gemini Live, WebSocket `/voice`, tool registry, two-step pump control)

## Screenshots & designs

- [`screenshots/`](./screenshots) — login (desktop + mobile)
- [`designs/`](./designs) — Figma exports (mandi screens)

## API reference

The API publishes interactive Swagger/OpenAPI docs at `http://localhost:4000/docs` when running.

## Regenerating diagrams

The `.mmd` (Mermaid) sources render to `exports/` via:

```bash
node docs/render-userflow-exports.mjs
```
