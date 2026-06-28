# Collab Editor — Phase 1

Single-user document editor: Django REST API + Postgres-ready persistence
on the backend, React + Tiptap on the frontend. No real-time sync, no auth
yet — that's Phase 2 onward. See `PROJECT_BRIEF.md` (the file from our
planning conversation) for the full phased roadmap.

This phase is **done** when you can: create a document, type in it, refresh
the page, and see your content reloaded from the database.

## What's here

```
backend/    Django + DRF API (documents app: CRUD)
frontend/   React + Vite + Tiptap editor
```

The data model already has the fields later phases need (`Document.owner`
as a real FK, `Document.yjs_state` as a binary column) so adding real-time
sync, auth, and sharing won't require reshaping what's already built.

## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # defaults to local SQLite, no edits needed yet

python manage.py makemigrations documents
python manage.py migrate
python manage.py runserver      # http://localhost:8000
```

Run the test suite any time with:

```bash
python manage.py test
```

### Switching to Postgres

SQLite is the zero-setup default so you can get moving immediately, but the
project brief calls for Postgres, and you'll want it from Phase 5 onward
regardless. Once you have a local Postgres instance:

```bash
createdb collab_editor
```

then set in `backend/.env`:

```
DATABASE_URL=postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/collab_editor
```

and re-run `python manage.py migrate`.

## Frontend setup

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The frontend expects the API at `http://localhost:8000/api` (see
`frontend/src/api.js`). Override with a `VITE_API_BASE` env var if needed.

## Trying it out

1. Start the backend (`runserver`) and frontend (`npm run dev`) in two
   terminals.
2. Open `http://localhost:5173`.
3. Click **+ New document**, type something, watch the save status go
   Unsaved → Saving… → Saved.
4. Refresh the page, reopen the document — your content is still there.
5. Optional: open `http://localhost:8000/admin/` (after
   `python manage.py createsuperuser`) to see the raw `Document` rows,
   including the JSON `content` field.

## Next step

Once this works end-to-end, move on to Phase 2 in `PROJECT_BRIEF.md`:
swapping the plain JSON content storage for Yjs, and adding the Django
Channels WebSocket layer so two browser sessions stay in sync live.
