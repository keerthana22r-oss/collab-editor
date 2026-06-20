import Collaboration from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { useCollaborativeDoc } from "../sync/useCollaborativeDoc";

const STATUS_LABEL = {
  loading: "Loading…",
  connected: "Synced",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  disconnected: "Offline — changes saved locally",
  error: "Couldn't save",
};

export default function Editor({ documentId, onBack }) {
  const { ydoc, title, setTitle, status } = useCollaborativeDoc(documentId);

  const editor = useEditor(
    {
      extensions: [
        // Yjs owns undo/redo history once Collaboration is active; the
        // built-in history extension would fight with it. (Real undo/redo
        // support via @tiptap/extension-collaboration-history is a known
        // gap for now -- Ctrl+Z won't do anything meaningful yet.)
        StarterKit.configure({ history: false }),
        Collaboration.configure({ document: ydoc }),
      ],
    },
    [ydoc]
  );

  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <button className="link-button" onClick={onBack}>
          &larr; All documents
        </button>
        <span className={`save-status save-status--${status}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <input
        className="editor-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Untitled document"
      />

      {editor && (
        <div className="editor-toolbar">
          <button
            type="button"
            className={editor.isActive("bold") ? "active" : ""}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            className={editor.isActive("italic") ? "active" : ""}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>i</em>
          </button>
          <button
            type="button"
            className={editor.isActive("heading", { level: 2 }) ? "active" : ""}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </button>
          <button
            type="button"
            className={editor.isActive("bulletList") ? "active" : ""}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </button>
          <button
            type="button"
            className={editor.isActive("orderedList") ? "active" : ""}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </button>
        </div>
      )}

      <div className="editor-page-surface">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
