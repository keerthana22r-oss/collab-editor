import { useEffect, useState } from "react";
import { createDocument, deleteDocument, listDocuments } from "../api";

export default function DocumentList({ onOpen, onLogout }) {
  const [docs, setDocs] = useState([]);
  const [fetchStatus, setFetchStatus] = useState("loading");

  const load = () => {
    setFetchStatus("loading");
    listDocuments()
      .then((data) => { setDocs(data); setFetchStatus("ready"); })
      .catch(() => setFetchStatus("error"));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    const doc = await createDocument("Untitled document");
    onOpen(doc.id);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this document?")) return;
    await deleteDocument(id);
    load();
  };

  return (
    <div className="doc-list-page">
      <header className="doc-list-header">
        <h1>Your documents</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="primary-button" onClick={handleCreate}>+ New document</button>
          <button className="ghost-button" onClick={onLogout}>Log out</button>
        </div>
      </header>

      {fetchStatus === "loading" && <p className="muted">Loading…</p>}
      {fetchStatus === "error" && <p className="muted">Couldn't reach the API. Is the Django server running?</p>}
      {fetchStatus === "ready" && docs.length === 0 && <p className="muted">No documents yet — create your first one.</p>}

      <ul className="doc-list">
        {docs.map((doc) => (
          <li key={doc.id} className="doc-list-item" onClick={() => onOpen(doc.id)}>
            <div>
              <div className="doc-title">{doc.title || "Untitled document"}</div>
              <div className="doc-meta">Updated {new Date(doc.updated_at).toLocaleString()}</div>
            </div>
            <button className="ghost-button" onClick={(e) => handleDelete(doc.id, e)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
