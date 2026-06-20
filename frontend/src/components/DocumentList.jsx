import { useEffect, useState } from "react";

import { createDocument, deleteDocument, listDocuments } from "../api";

export default function DocumentList({ onOpen }) {
  const [docs, setDocs] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const load = () => {
    setStatus("loading");
    listDocuments()
      .then((data) => {
        setDocs(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    const doc = await createDocument("Untitled document");
    onOpen(doc.id);
  };

  const handleDelete = async (id, event) => {
    event.stopPropagation();
    if (!window.confirm("Delete this document? This can't be undone.")) return;
    await deleteDocument(id);
    load();
  };

  return (
    <div className="doc-list-page">
      <header className="doc-list-header">
        <h1>Your documents</h1>
        <button className="primary-button" onClick={handleCreate}>
          + New document
        </button>
      </header>

      {status === "loading" && <p className="muted">Loading…</p>}
      {status === "error" && (
        <p className="muted">
          Couldn't reach the API. Is the Django server running on
          localhost:8000?
        </p>
      )}
      {status === "ready" && docs.length === 0 && (
        <p className="muted">No documents yet — create your first one.</p>
      )}

      <ul className="doc-list">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="doc-list-item"
            onClick={() => onOpen(doc.id)}
          >
            <div>
              <div className="doc-title">{doc.title || "Untitled document"}</div>
              <div className="doc-meta">
                Updated {new Date(doc.updated_at).toLocaleString()}
              </div>
            </div>
            <button
              className="ghost-button"
              onClick={(event) => handleDelete(doc.id, event)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
