# Phase 3 — Presence

Adds live cursors (labeled by name/color) and a "who's viewing this
document" avatar list, using Yjs Awareness.

## What changed since Phase 2

**Backend:** nothing, on purpose. `consumers.py` was already a byte-blind
relay -- it doesn't parse what it forwards. Presence is just a second kind
of message now flowing over the same socket as document updates. The
docstring got a one-line clarification; that's the only diff.

**Frontend**
- `src/sync/identity.js` — gives each browser tab a stable `{ name, color }`
  guest identity (stored in `sessionStorage`, so two windows of the same
  browser get genuinely different identities — useful for actually testing
  this).
- `src/sync/useCollaborativeDoc.js` — now also creates a Yjs `Awareness`
  instance and relays its updates over the WebSocket. Since doc updates and
  awareness updates now share one connection, every message is framed with
  a 1-byte type prefix so the client knows which is which (see
  `MESSAGE_TYPE` at the top of the file).
- `src/components/PresenceList.jsx` — new: renders the avatar list, reading
  live from `awareness.getStates()`.
- `src/components/Editor.jsx` — adds Tiptap's `CollaborationCursor`
  extension, which renders everyone else's live cursor/selection inline in
  the document, using the same `Awareness` instance.

## Running it

```bash
cd frontend
npm install     # picks up y-protocols and the collaboration-cursor extension
npm run dev
```

No backend or Redis changes needed — if Phase 2 was working, this should
just work on top of it.

## Verifying it

1. Open the same document in two separate browser **windows** (not tabs —
   `sessionStorage` is per-window, and you want two different guest
   identities for this to be a meaningful test).
2. You should see two avatars (different colors/initials) in the top-right
   of both windows.
3. Click into the text in one window — a colored cursor with a name label
   should appear in the *other* window at that position, and move live as
   you type or click around.
4. Close one window entirely. Within a couple seconds, its avatar and
   cursor should disappear from the remaining window (this is the
   `awareness.setLocalState(null)` cleanup firing on unmount/disconnect —
   or, if the tab was killed too abruptly for that to run, Yjs's own
   ~30-second stale-state timeout catches it instead).

## Known limitations (worth knowing for interview follow-ups)

- Guest names are random per tab, not real identities — that's what
  Phase 4 (auth) replaces.
- No "rename yourself" UI yet; not hard to add, just deferred since real
  names are coming from auth shortly anyway.
- Cursor labels show name only, not what they're currently selecting in a
  summarized way (e.g. no "Alice is editing the title") — Tiptap's
  collaboration cursor only covers the document body, not the separate
  title input.

## Next step

Phase 4: authentication and sharing — JWT auth, an invite flow, and
owner/editor/viewer roles enforced both in the REST API and in the
WebSocket consumer. See `PROJECT_BRIEF.md`.
