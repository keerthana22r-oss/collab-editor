Real-Time Collaborative Document Editor

A Google Docs-style collaborative editor built with Django, React, and Yjs. Multiple users can edit the same document simultaneously, with changes appearing live for everyone connected.

Live demo: (deploy link goes here once deployed to Render/Railway)

GitHub: (your repo link)


What's built so far

✅ Phase 1 — Single-user editor


Django REST Framework backend with full document CRUD API
React + Vite frontend with Tiptap rich text editor
Documents saved to and loaded from a database (SQLite locally, Postgres in production)
Debounced autosave with status indicator (Unsaved → Saving → Saved)
Bold, italic, headings, bullet lists, numbered lists via toolbar


✅ Phase 2 — Real-time sync


Yjs CRDT integrated with Tiptap via @tiptap/extension-collaboration
Django Channels WebSocket consumer relaying binary Yjs updates between clients
Redis-backed channel layer (Memurai on Windows, Redis elsewhere) so messages relay across multiple server processes
Two browsers editing the same document stay in sync within ~1 second
Offline resilience: edits made while disconnected merge automatically on reconnect (Yjs handles this via CRDT semantics — no manual diff logic)
REST snapshot persistence: full Yjs state saved to Postgres as a binary blob every 2 seconds of activity, so new joiners bootstrap correctly


✅ Phase 3 — Presence


Live avatar circles (top-right of editor) showing every connected user by initial and color
Random guest identity per browser session (name + color), stable across reloads of the same tab
Live cursors inside the document showing each collaborator's position by name and color, powered by @tiptap/extension-collaboration-cursor and Yjs Awareness
Presence piggybacks on the same WebSocket connection as document sync — no separate channel needed
Avatar disappears when a user closes their tab


✅ Phase 4 — Authentication and sharing


JWT-based auth (login, register, token refresh) via djangorestframework-simplejwt
All API endpoints and WebSocket connections are authenticated
Document ownership: each document has an owner
Invite collaborators by email with Editor or Viewer role

Editors can read and write
Viewers can read and see live cursors but cannot make edits (enforced server-side in both the REST API and the WebSocket consumer — not just hidden in the UI)



Pending invites stored by email and attached when that email signs up
Share modal in the editor UI showing current collaborators and their roles
Log out button on the document list



Architecture

Browser (React + Tiptap + Yjs)
    │
    ├── REST (HTTP)  ──────────────► Django REST Framework
    │   auth, CRUD, snapshots           PostgreSQL
    │
    └── WebSocket ─────────────────► Django Channels Consumer
        Yjs updates + Awareness         Redis Channel Layer
        (binary, framed with 1-byte     (pub/sub between workers)
         message type prefix)

Why these technology choices

Yjs (CRDT) over Operational Transform

Yjs operations are conflict-free by mathematical definition — concurrent edits from multiple users (including those who were offline) merge deterministically without a central sequencing server. The server never needs to understand what changed, only relay the bytes. OT (used by Google Docs internally) requires a central server to arbitrate the order of operations, which is harder to scale and harder to implement correctly.

Django Channels + Redis over a separate Node relay

Keeps one backend language and one deployment instead of two. Channels' Redis channel layer gives pub/sub across multiple ASGI worker processes for free — when two users are connected to different server instances, their messages still reach each other via Redis. The trade-off: a dedicated Node y-websocket server is simpler and more battle-tested for just the sync layer, but introduces a second stack to maintain and deploy.

Dumb relay consumer

The WebSocket consumer never parses the Yjs binary format. It just rebroadcasts incoming bytes to everyone else in the same document's channel group. This keeps the server stateless with respect to document content, which makes it easy to reason about, easy to test, and horizontally scalable. The trade-off: a joining client bootstraps from the last REST snapshot rather than from a live server-side Y.Doc, which means there's a brief window (between an edit and its next snapshot save) where a newly joining client might miss recent changes until the next broadcast.

PostgreSQL + binary Yjs state

The source of truth for document content is the Yjs binary state (a compact encoding of the full CRDT graph), stored as a bytea column. Plain text or HTML is never stored separately — it would be a denormalized copy that could get out of sync. Snapshots are taken on a debounced timer during active editing.

JWT authentication

Stateless — no server-side session store needed. The access token travels as a Bearer header on REST requests. For WebSocket connections (where browsers can't set custom headers), the AuthMiddlewareStack from Django Channels reads the token from the session established during the HTTP upgrade handshake.


What would change at larger scale

ConcernCurrent approachAt scaleWebSocket relaySingle Redis channel layerShard channel groups by document ID range across multiple Redis instances; or move to a dedicated sync cluster separate from the HTTP API workersYjs state persistenceDebounced REST snapshot to Postgres byteaMove snapshots to object storage (S3/GCS) once documents grow large; keep only a pointer in PostgresNew client bootstrapLoad from last REST snapshotMaintain a live server-side Y.Doc using y-py Python bindings so the server can answer "what's the current state" directly over the WebSocket, closing the consistency gapAwareness / cursor trafficRelayed identically to doc updatesRate-limit awareness messages separately — cursor moves are the highest-frequency message type and don't need the same delivery guarantee as doc editsAuthJWT with 1-hour access tokensAdd OAuth (Google/GitHub) for easier onboarding; short-lived tokens + refresh rotation already in placeSearchNot implementedIndex plain-text content (derived from Yjs state via y-py) into a search engine like Meilisearch or Postgres full-text search


How to run locally

Prerequisites


Python 3.11+
Node.js 18+
Redis on port 6379 (Docker: docker run -d -p 6379:6379 redis, or Memurai on Windows)


Backend

bashcd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations accounts
python manage.py makemigrations documents
python manage.py migrate
python manage.py runserver      # ASGI via Daphne, http://localhost:8000

Frontend

bashcd frontend
npm install
npm run dev                     # http://localhost:5173

Open http://localhost:5173, sign up, create a document. Open a second browser window, sign up as a different user, get invited via the Share button, and open the same document — edits appear live in both windows.

Tests

bashcd backend
python manage.py test

Covers: document CRUD, role-based permission enforcement (viewer cannot edit, editor can), auth (register/login/me), WebSocket consumer relay and isolation between documents.


Repo structure

backend/
  config/         Django settings, ASGI routing, URL config
  accounts/       Auth app: register, login (JWT), /me
  documents/      Core app: Document + DocumentCollaborator models,
                  REST API, WebSocket consumer, tests
  requirements.txt

frontend/
  src/
    auth/         Login / register page
    components/   DocumentList, Editor, PresenceList, ShareModal
    sync/         useCollaborativeDoc hook, identity helper
    api.js        Fetch wrapper with JWT token management
    App.jsx       Auth gate + top-level routing
    index.css     All styles


Phases remaining


Phase 5 — Version history: periodic document snapshots, UI to view and restore earlier versions
Phase 6 — Polish: CI pipeline (GitHub Actions), production deployment to Render/Railway with managed Postgres and Redis, final README with architecture diagram and live demo link
