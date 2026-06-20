import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

import { getDocument, updateDocument } from "../api";

const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:8000";
const SNAPSHOT_DELAY_MS = 2000;

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Wires a shared Y.Doc up to two transports:
 *
 *  - WebSocket: a "dumb relay" connection (see backend/documents/consumers.py)
 *    that rebroadcasts every local Yjs update to other clients currently
 *    viewing the same document. This is what makes edits appear live,
 *    sub-second, for everyone connected right now.
 *
 *  - REST: loads the document's last-persisted state on open, and saves a
 *    debounced full-state snapshot (Y.encodeStateAsUpdate) after edits.
 *    This is what a *newly arriving* client bootstraps from, and what
 *    survives a server restart.
 *
 * Known limitation: a client that connects in the few seconds between
 * someone else's edit and that edit's next debounced snapshot save won't
 * see that edit until the next save fires (or until that peer types again
 * and it gets relayed live). Acceptable for this project's scope; a
 * production system would close this gap with a server-side merged Y.Doc
 * (see the docstring in consumers.py) instead of relying on REST snapshots.
 *
 * Note: each call to this hook owns exactly one Y.Doc for its whole
 * lifetime. The Editor component is mounted with `key={documentId}` (see
 * App.jsx) specifically so that switching documents creates a fresh hook
 * instance -- and a fresh Y.Doc -- rather than reusing one across
 * documents.
 */
export function useCollaborativeDoc(documentId) {
  const ydocRef = useRef(null);
  if (!ydocRef.current) ydocRef.current = new Y.Doc();
  const ydoc = ydocRef.current;

  const [title, setTitleState] = useState("");
  const [status, setStatus] = useState("loading");

  const snapshotTimer = useRef(null);
  const titleSaveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let ws = null;
    let handleLocalUpdate = null;

    setStatus("loading");

    const scheduleSnapshot = () => {
      setStatus((current) => (current === "loading" ? current : "unsaved"));
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
      snapshotTimer.current = setTimeout(async () => {
        setStatus("saving");
        try {
          await updateDocument(documentId, {
            yjs_state: bytesToBase64(Y.encodeStateAsUpdate(ydoc)),
          });
          setStatus(ws && ws.readyState === WebSocket.OPEN ? "connected" : "disconnected");
        } catch {
          setStatus("error");
        }
      }, SNAPSHOT_DELAY_MS);
    };

    getDocument(documentId).then((doc) => {
      if (cancelled) return;
      setTitleState(doc.title);

      if (doc.yjs_state) {
        Y.applyUpdate(ydoc, base64ToBytes(doc.yjs_state), "remote");
      }

      ws = new WebSocket(`${WS_BASE}/ws/documents/${documentId}/`);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => setStatus("connected");
      ws.onclose = () => setStatus("disconnected");
      ws.onerror = () => setStatus("disconnected");

      ws.onmessage = (event) => {
        Y.applyUpdate(ydoc, new Uint8Array(event.data), "remote");
      };

      handleLocalUpdate = (update, origin) => {
        // Updates tagged "remote" came from applyUpdate above (loaded from
        // REST, or relayed from another client) -- don't bounce those back
        // out, only broadcast genuinely local edits.
        if (origin === "remote") return;
        if (ws.readyState === WebSocket.OPEN) ws.send(update);
        scheduleSnapshot();
      };
      ydoc.on("update", handleLocalUpdate);
    });

    return () => {
      cancelled = true;
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      if (handleLocalUpdate) ydoc.off("update", handleLocalUpdate);
      if (ws) ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const setTitle = (value) => {
    setTitleState(value);
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => {
      updateDocument(documentId, { title: value }).catch(() => {
        // Non-blocking: a failed title save just means it'll retry on the
        // next edit. Logged for visibility during local dev.
        console.error("Failed to save title");
      });
    }, SNAPSHOT_DELAY_MS);
  };

  return { ydoc, title, setTitle, status };
}
