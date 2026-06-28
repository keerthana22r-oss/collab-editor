import { useEffect, useState } from "react";
import { getCollaborators, inviteCollaborator } from "../api";

export default function ShareModal({ documentId, onClose }) {
  const [collabs, setCollabs] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [status, setStatus] = useState("");

  const load = () => getCollaborators(documentId).then(setCollabs).catch(() => {});
  useEffect(() => { load(); }, [documentId]);

  const invite = async () => {
    if (!email) return;
    setStatus("Sending…");
    try {
      await inviteCollaborator(documentId, email, role);
      setEmail("");
      setStatus("Invited!");
      load();
    } catch {
      setStatus("Failed — check the email and try again.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share document</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-invite-row">
          <input
            className="auth-input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && invite()}
          />
          <select className="role-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button className="primary-button" onClick={invite}>Invite</button>
        </div>
        {status && <p className="modal-status">{status}</p>}

        {collabs.length > 0 && (
          <ul className="collab-list">
            {collabs.map((c) => (
              <li key={c.id} className="collab-item">
                <span>{c.username || c.invited_email}</span>
                <span className="collab-role">{c.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
