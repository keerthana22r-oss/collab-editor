# Phase 2 — Real-time sync

Adds live collaborative editing: two browser sessions on the same document
now see each other's keystrokes within about a second, with no overwritten
or lost edits.

## What changed since Phase 1

**Backend**
- `documents/consumers.py` — a new Django Channels `DocumentConsumer`. It's
  a deliberately "dumb" relay: it rebroadcasts every binary message it
  receives to every other client viewing the same document, without
  parsing the Yjs format. Read the docstring in that file — it's the
  single most important piece of this project to understand and be able
  to explain.
- `documents/routing.py` + `config/asgi.py` — wires that consumer up at
  `ws://localhost:8000/ws/documents/<id>/`, via a Redis-backed channel
  layer (`channels_redis`) so messages can be relayed across multiple
  server processes, not just within one.
- `documents/serializers.py` — `Document.yjs_state` (binary) now travels
  over the REST API as base64, so the frontend can load/save the full Yjs
  state alongside title/content.
- `documents/tests_consumer.py` — an integration test that connects two
  fake WebSocket clients to the same consumer and asserts updates relay
  between them (and not to clients on a different document). Runs against
  Channels' in-memory layer, so it doesn't need Redis to pass.

**Frontend**
- `src/sync/useCollaborativeDoc.js` — a new hook that is the whole sync
  layer: loads persisted state via REST, opens the WebSocket, applies
  incoming updates to a shared `Y.Doc`, relays local edits out, and
  debounce-saves full snapshots back over REST. Read the comment block at
  the top — it explains the REST-vs-WebSocket division of responsibility
  and the one known consistency gap it trades for simplicity.
- `src/components/Editor.jsx` — now binds Tiptap to that shared `Y.Doc` via
  `@tiptap/extension-collaboration`, instead of loading/saving plain JSON.

## One-time setup: Redis

Channels needs a running Redis (or Redis-compatible) server to relay
messages between server processes. Pick one:

- **Docker**: `docker run -d --name redis -p 6379:6379 redis`
- **Windows without Docker**: install [Memurai](https://www.memurai.com/)
  (free Developer edition) — it runs as a native Windows service on port
  6379, no extra commands needed.
- **macOS**: `brew install redis && brew services start redis`
- **Linux**: `sudo apt install redis-server && sudo systemctl start redis-server`

Verify it's up with `redis-cli ping` (should reply `PONG`), or just try
running the backend below — if Redis isn't reachable, Django will fail
loudly on first WebSocket connection.

## Running it

```bash
cd backend
pip install -r requirements.txt   # picks up channels, channels-redis, daphne
python manage.py runserver        # now serves both HTTP and WebSocket (ASGI)
```

```bash
cd frontend
npm install                        # picks up yjs, @tiptap/extension-collaboration
npm run dev
```

## Verifying live sync

1. Open `http://localhost:5173`, create or open a document.
2. Copy that exact URL... actually there isn't a per-document URL yet
   (that's a small gap -- everything's client-side state right now). For
   now: open a **second browser window** (or an incognito window) at
   `http://localhost:5173`, and click into the **same document** from the
   list in both windows.
3. Type in one window. The other window's content should update within
   about a second, with the status indicator (top-right) showing
   **Synced**.
4. Try typing in both windows at once, in different parts of the document
   — both sets of edits should survive (this is the CRDT merge actually
   doing its job, not just last-write-wins).
5. Refresh either window — the merged content should still be there
   (confirms the REST snapshot persistence is working alongside the live
   relay).

Run the test suite (now includes the WebSocket integration test):

```bash
cd backend
python manage.py test
```

## Next step

Phase 3: presence — live cursors and a "who's viewing this document"
indicator, using Yjs Awareness. See `PROJECT_BRIEF.md`.
