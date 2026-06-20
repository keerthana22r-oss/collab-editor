# Real-Time Collaborative Document Editor — Project Brief

This is the seed spec for building a Google-Docs-style collaborative editor.
Build it **phase by phase**, in order. Don't skip ahead to deployment or
polish before each phase actually works end-to-end. After each phase: run
the app, manually verify the feature, commit, then move on.

---

## 1. Tech stack (fixed — don't substitute)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite | Tiptap for the rich text editor |
| Editor sync layer | Yjs (CRDT) | `y-prosemirror` binds Yjs to Tiptap's ProseMirror core |
| WebSocket provider | `y-websocket` (client) | |
| Realtime transport | Django Channels + Redis channel layer | one Channels consumer per document "room" |
| Backend API | Django REST Framework | auth, documents, sharing, versions |
| Auth | JWT (`djangorestframework-simplejwt`) | access + refresh tokens |
| Database | PostgreSQL | |
| Deployment | Render or Railway | separate services for Django ASGI app + Postgres + Redis |

**Why Yjs over plain operational transform or "last write wins":** Yjs is a
CRDT — operations commute and merge deterministically without a central
sequencing server, which is what makes offline edits mergeable and makes the
server a dumb relay instead of a conflict arbiter. Be ready to explain this
trade-off in interviews: CRDTs trade some payload/metadata overhead
(per-character operation IDs) for the ability to merge concurrent edits,
including offline ones, without a central transform algorithm.

**Why Django Channels instead of a separate Node relay:** keeps one backend
language/deployment instead of two, and Channels' Redis channel layer gives
you pub/sub across multiple ASGI worker processes for free, which you need
once you're not on a single process. The trade-off to mention in interviews:
a dedicated Node `y-websocket` relay is simpler and more battle-tested for
*just* the sync layer, but then you're running two backend stacks.

---

## 2. Data model (PostgreSQL, via Django models)

```
User (Django's built-in auth user, or a thin custom user model)

Document
  id (uuid, pk)
  title
  owner -> User
  created_at, updated_at
  yjs_state (bytea, nullable)   # latest persisted Yjs binary update (the CRDT doc state)

DocumentCollaborator
  document -> Document
  user -> User
  role: enum [owner, editor, viewer]
  invited_email (nullable, for pending invites to non-existing users)
  created_at
  unique_together: (document, user)

DocumentVersion
  document -> Document
  yjs_state (bytea)             # snapshot of Yjs state at this point
  created_at
  created_by -> User (nullable, null = autosave)
  label (nullable, e.g. "Before big rewrite")
```

Key design point: **the source of truth for content is the Yjs binary
state**, not parsed HTML/JSON. Postgres stores that binary blob. Don't try
to keep a separate "plain text" column in sync with it — derive plain
text/HTML on read only when needed (e.g. for search or version preview).

---

## 3. Build phases

### Phase 1 — Single-user editor (no real-time yet)
- Django project + DRF: `Document` CRUD API (create, list mine, retrieve,
  rename, delete). No auth yet, or a single hardcoded test user.
- React + Vite + Tiptap: load a document's content, edit it, save on a
  debounce or explicit save button, reload from Postgres.
- At this stage Tiptap content can just be stored as JSON (Tiptap's native
  JSON doc format), not Yjs yet — Yjs gets introduced in Phase 2.
- **Done when:** you can create a doc, type in it, refresh the page, and see
  your content reloaded from Postgres.

### Phase 2 — Real-time sync
- Swap Tiptap's plain JSON storage for the Yjs extension
  (`@tiptap/extension-collaboration`) bound to a `Y.Doc`.
- Add a Django Channels consumer at `/ws/documents/<id>/` that:
  - on connect, sends the document's current Yjs state (from Postgres) to
    the client
  - relays incoming Yjs update messages to all other clients in the same
    document's channel group (via Redis channel layer)
  - periodically (or on disconnect/debounce) persists the merged Yjs state
    back to `Document.yjs_state`
- Frontend: connect via `y-websocket`'s `WebsocketProvider`, pointed at that
  Channels endpoint.
- **Done when:** two browser tabs (or two browsers) editing the same
  document see each other's keystrokes within ~1 second, and neither
  overwrites the other.

### Phase 3 — Presence
- Use Yjs Awareness (`y-protocols/awareness`), which `y-websocket` already
  carries alongside document updates — no separate channel needed.
- Each client sets its local awareness state to `{ name, color, cursor }`.
- Tiptap's collaboration-cursor extension
  (`@tiptap/extension-collaboration-cursor`) renders remote cursors/selections
  automatically from awareness state.
- Add a simple "who's viewing" avatar list in the UI from the same awareness
  states.
- **Done when:** opening the doc in two sessions shows each user's name/color
  cursor live in the other session, and an avatar list of current viewers.

### Phase 4 — Auth and sharing
- `djangorestframework-simplejwt`: signup, login, refresh endpoints.
- Lock down document endpoints and the Channels consumer to authenticated
  users (JWT passed as a query param or subprotocol on the WS handshake,
  since browsers can't set custom headers on WebSocket connections).
- Permission checks: only `owner`/`editor` can write; `viewer` is read-only
  (enforce both in the REST API and by rejecting Yjs update messages from
  viewer-role connections in the Channels consumer — don't rely on the
  frontend to enforce this).
- Invite flow: owner enters a collaborator's email + role; if the user
  exists, create a `DocumentCollaborator` row; if not, store it as a pending
  invite keyed by email and attach it when that email signs up.
- **Done when:** a second account can be invited as editor or viewer and the
  role is actually enforced server-side, not just hidden in the UI.

### Phase 5 — Persistence and version history
- Periodic snapshot: every N minutes of active editing (or on every N-th
  update, whichever is simpler to implement reliably), write a
  `DocumentVersion` row with the current Yjs state.
- Version list UI: show timestamps, let the user preview a version
  (read-only render) and restore it (which means: create a new `Y.Doc`
  seeded from the snapshot's state and broadcast it as the new current state
  — this itself is a Yjs update, so it merges cleanly rather than requiring
  special-casing).
- **Done when:** you can roll back to an earlier version and collaborators'
  live sessions update to reflect the restored content.

### Phase 6 — Polish
- Tests:
  - Django: model tests for `Document`/`DocumentCollaborator` permission
    logic; an API test for the sharing/role enforcement; one integration
    test that exercises the Channels consumer (Channels ships
    `channels.testing.WebsocketCommunicator` for exactly this) — connect two
    fake clients, send a Yjs update from one, assert the other receives it.
  - Frontend: a couple of component tests for the editor and document list.
- GitHub Actions CI: run backend tests (`pytest` or Django's test runner)
  and frontend tests (`vitest`/`jest`) on every push; fail the build on
  lint errors too.
- Deployment (Render or Railway):
  - One service for the Django ASGI app (must run under an ASGI server —
    `daphne` or `uvicorn` — not the default WSGI dev server, since Channels
    needs ASGI).
  - Managed Postgres add-on.
  - Managed Redis add-on (Channels' channel layer needs it).
  - Static frontend build deployed either as a static site on the same
    platform or served by the Django app.
  - Environment variables for DB url, Redis url, JWT secret, allowed CORS
    origins.

---

## 4. Offline resilience (woven through Phase 2 onward, not a separate phase)

Yjs gives you this close to for free: `y-websocket`'s provider buffers local
edits while disconnected (Yjs ops are stored in the local `Y.Doc` regardless
of connection state) and on reconnect sends the accumulated update, which
merges into the shared state via the CRDT merge algorithm — no manual diff
logic needed. To actually demo this: edit in a tab, kill the network (devtools
offline mode), keep typing, restore network, and show the merge happening
with no lost keystrokes. Worth having `y-indexeddb` as a local persistence
provider too, so a hard refresh while offline doesn't lose unsynced edits.

---

## 5. README requirements (write this last, once the app works)

The README needs to read well *before* an interview, so structure it as:
1. **What it is** + live demo link + screenshot/gif.
2. **Architecture diagram** (even ASCII is fine) showing: browser ↔ REST API
   (Django/DRF) for auth/CRUD, browser ↔ WebSocket (Channels/Redis) for live
   sync, Postgres for persistence.
3. **Why these technologies** — CRDT vs OT, why Channels, why JWT, why
   Postgres for a bytea blob instead of a separate document store.
4. **What would change at larger scale** — e.g.: sharding Channels'
   Redis-backed groups across multiple Redis instances per document range;
   moving Yjs snapshotting to object storage instead of Postgres bytea once
   documents/snapshots get large; introducing a dedicated sync-server
   cluster (separating the WebSocket relay from the REST API process)
   so they can scale independently; rate-limiting/backpressure on the
   awareness channel since cursor updates are the highest-frequency
   messages.
5. **How to run it locally** and **how tests/CI work**.

---

## 6. Suggested repo structure

```
/backend
  /config           # Django settings, asgi.py, urls.py
  /documents        # app: models, serializers, views, consumers.py, tests
  /accounts         # app: auth views/serializers, tests
  requirements.txt
/frontend
  /src
    /editor         # Tiptap + Yjs wiring
    /presence       # awareness UI
    /documents      # doc list, create/rename/delete UI
    /auth           # login/signup
  package.json
.github/workflows/ci.yml
README.md
```

---

## How to use this with Claude Code

Start in an empty project directory, then prompt roughly:

> Read PROJECT_BRIEF.md. Start with Phase 1 only: set up the Django backend
> and React/Tiptap frontend with basic document CRUD, no real-time sync yet.
> Set up a Python venv and Postgres locally, get migrations running, and get
> me to the point where I can create a document, type in it, and reload it
> from the database. Then stop and let me test it before moving to Phase 2.

Then repeat for each subsequent phase in its own pass, testing in between.
This keeps each phase reviewable instead of getting one enormous,
hard-to-debug commit.
