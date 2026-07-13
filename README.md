# 🚀 Real-Time Collaborative Document Editor

> **A Google Docs-inspired collaborative document editor built with Django, React, WebSockets, Yjs CRDT, Redis, and PostgreSQL.**
>
> Collaborate in real time with multiple users, live cursors, role-based sharing, authentication, autosave, and conflict-free editing powered by CRDT technology.

---

## 🌐 Live Demo

🔗 Coming Soon

## 📂 Repository

🔗 Your GitHub Repository Link

---

# 📸 Preview

> Replace these placeholders with screenshots or GIFs.

| Login | Dashboard |
|-------|-----------|
| ![](screenshots/login.png) | ![](screenshots/dashboard.png) |

| Collaborative Editor |
|----------------------|
| ![](screenshots/editor.png) |

| Live Cursors |
|--------------|
| ![](screenshots/cursors.gif) |

---

# ✨ Features

## 📝 Rich Text Editing

- Create, edit and delete documents
- Rich text formatting
- Headings
- Bullet lists
- Numbered lists
- Bold & Italic
- Automatic saving

---

## ⚡ Real-Time Collaboration

- Multi-user editing
- Instant synchronization
- Live cursor tracking
- Live collaborator presence
- Conflict-free editing (CRDT)
- Offline editing support
- Automatic merge after reconnect

---

## 👥 Document Sharing

- JWT Authentication
- Secure Login & Registration
- Invite collaborators
- Share via email
- Owner permissions
- Editor permissions
- Viewer permissions
- Protected APIs
- Authenticated WebSockets

---

## 💾 Data Persistence

- PostgreSQL storage
- Binary Yjs document snapshots
- Debounced autosave
- Snapshot recovery
- Redis Pub/Sub

---

# 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React + Vite |
| Rich Text Editor | Tiptap |
| Real-Time Engine | Yjs (CRDT) |
| Backend | Django |
| API | Django REST Framework |
| Authentication | JWT |
| WebSockets | Django Channels |
| Channel Layer | Redis |
| Database | PostgreSQL |
| Deployment | Render (Planned) |

---

# 🏗 System Architecture

```
                   +----------------------+
                   |      React App       |
                   |  Tiptap + Yjs Client |
                   +----------+-----------+
                              |
              REST API        |       WebSocket
                              |
         +--------------------+------------------+
         |                                       |
+--------v--------+                    +----------v---------+
| Django REST API |                    | Django Channels    |
| CRUD / Auth     |                    | WebSocket Consumer |
+--------+--------+                    +----------+---------+
         |                                        |
         |                                        |
+--------v--------+                    +----------v---------+
| PostgreSQL      |                    | Redis Pub/Sub      |
+-----------------+                    +--------------------+
```

---

# 🚀 Key Highlights

- Google Docs style collaboration
- Conflict-free editing using CRDT
- Binary synchronization
- Offline support
- JWT Authentication
- Live cursor tracking
- Live user presence
- Role-based authorization
- Redis-powered WebSockets
- Snapshot persistence

---

# 📂 Project Structure

```
backend/
│
├── accounts/
├── documents/
├── config/
├── requirements.txt
│
frontend/
│
├── src/
│   ├── auth/
│   ├── components/
│   ├── sync/
│   ├── api/
│   ├── App.jsx
│   └── main.jsx
```

---

# ⚙ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/repository-name.git

cd repository-name
```

---

## Backend

```bash
cd backend

python -m venv venv

source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt

python manage.py migrate

python manage.py runserver
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# 🔄 Real-Time Synchronization Flow

```
User A
   │
Edit Document
   │
   ▼
Yjs Update
   │
WebSocket
   │
Django Channels
   │
Redis Pub/Sub
   │
Other Connected Clients
   │
User B
```

---

# 🔐 Authentication Flow

```
User Login
      │
      ▼
JWT Access Token
      │
 REST Requests
      │
Protected APIs

WebSocket Handshake

Authenticated Connection
```

---

# 🧠 Why Yjs?

Unlike Operational Transform (OT), **Yjs uses Conflict-free Replicated Data Types (CRDTs)**, allowing concurrent edits from multiple users—even while offline—to merge automatically without requiring a central conflict resolution server.

### Benefits

- Offline-first
- Conflict-free merging
- High performance
- Small binary updates
- Server acts as a relay
- Horizontally scalable

---

# 🧪 Testing

Current automated tests include:

- Authentication
- Registration
- Login
- Document CRUD
- Role permissions
- Viewer restrictions
- WebSocket relay
- Collaboration isolation

Run tests:

```bash
python manage.py test
```

---

# 📊 Current Development Progress

| Module | Status |
|---------|--------|
| Rich Text Editor | ✅ |
| CRUD API | ✅ |
| Real-Time Sync | ✅ |
| Live Presence | ✅ |
| Authentication | ✅ |
| Sharing | ✅ |
| Version History | 🚧 |
| Deployment | 🚧 |
| CI/CD | 🚧 |

---

# 📈 Future Improvements

- Version History
- Comments
- Mention Users
- Notifications
- Dark Mode
- AI Writing Assistant
- Export to PDF
- Google Authentication
- Markdown Import/Export
- Search Documents

---

# 💡 Challenges Solved

During development, several technical challenges were addressed:

- Implemented real-time collaboration using WebSockets
- Integrated CRDT-based synchronization
- Managed live presence and cursor awareness
- Built secure role-based access control
- Optimized autosave using debounced snapshots
- Combined REST APIs with persistent WebSocket communication

---

# 📚 What I Learned

This project helped me gain hands-on experience with:

- Django Channels
- Redis Pub/Sub
- WebSocket Communication
- Yjs CRDT
- JWT Authentication
- Rich Text Editors
- Real-Time System Design
- Backend Scalability
- Role-Based Authorization
- Collaborative Software Architecture

---

# 🙋 About the Developer

**Keerthana K R**

Aspiring Software Engineer passionate about building scalable full-stack applications with modern web technologies.

### Connect with Me

- GitHub
- LinkedIn
- Portfolio

---

# ⭐ Support

If you found this project useful or interesting, consider giving it a ⭐ on GitHub!

---

## 📜 License

This project is licensed under the MIT License.
