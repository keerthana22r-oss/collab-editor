import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

import { useCollaborativeDoc } from "../sync/useCollaborativeDoc";
import PresenceList from "./PresenceList";
import ShareModal from "./ShareModal";

const STATUS_LABEL = {
  loading: "Loading…", connected: "Synced", unsaved: "Unsaved",
  saving: "Saving…", disconnected: "Offline", error: "Error",
};

export default function Editor({ documentId, onBack }) {
  const { ydoc, awareness, presenceUsers, title, setTitle, status } =
    useCollaborativeDoc(documentId);
  const [sharing, setSharing] = useState(false);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({ provider: { awareness } }),
      ],
    },
    [ydoc]
  );

  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <button className="link-button" onClick={onBack}>← All documents</button>
        <div className="editor-topbar-right">
          <PresenceList users={presenceUsers} />
          <button className="ghost-button" onClick={() => setSharing(true)}>Share</button>
          <span className={`save-status save-status--${status}`}>{STATUS_LABEL[status] ?? status}</span>
        </div>
      </div>

      <input
        className="editor-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled document"
      />

      {editor && (
        <div className="editor-toolbar">
          {[
            { label: "B", cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
            { label: "i", cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
            { label: "H2", cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
            { label: "• List", cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
            { label: "1. List", cmd: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
          ].map(({ label, cmd, active }) => (
            <button key={label} type="button" className={active ? "active" : ""} onClick={cmd}>{label}</button>
          ))}
        </div>
      )}

      <div className="editor-page-surface">
        <EditorContent editor={editor} />
      </div>

      {sharing && <ShareModal documentId={documentId} onClose={() => setSharing(false)} />}
    </div>
  );
}
