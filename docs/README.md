# Steering docs

Short, durable docs to bring any new session (or collaborator) up to speed quickly. Keep these tight — link out instead of duplicating, and update them as decisions change.

| File | Purpose |
| --- | --- |
| [vision.md](./vision.md) | What we're building and why. The product pitch. |
| [architecture.md](./architecture.md) | Stack, data flow, file map. How the pieces fit. |
| [story-format.md](./story-format.md) | Schema and conventions for `src/data/story.js` (beats, prompts, narration). |
| [decart-notes.md](./decart-notes.md) | Decart SDK gotchas — tokens, models, prompt switching, limits. |
| [roadmap.md](./roadmap.md) | What's done, what's next, open questions. |
| [decisions.md](./decisions.md) | Append-only log of decisions and trade-offs. Read this to understand why things are the way they are. |

## How to catch up in a new session

1. Read `vision.md` (1 min) and `roadmap.md` (1 min) — that's "what" and "where we are".
2. Skim `architecture.md` and `story-format.md` if touching code.
3. Skim recent entries in `decisions.md` to avoid re-litigating settled questions.

## How to keep these honest

- After a meaningful design choice → append to `decisions.md`.
- After shipping a milestone → update `roadmap.md` (move from "Next" to "Done").
- After hitting a Decart SDK quirk worth remembering → add to `decart-notes.md`.
- If a doc starts disagreeing with the code, the code wins — fix the doc.
