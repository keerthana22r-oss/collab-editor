import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";

import { getDocument, updateDocument } from "../api";
import { getIdentity } from "./identity";

const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:8000";
const SAVE_DELAY = 2000;
const MSG_DOC = 0;
const MSG_AWARENESS = 1;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function pack(type, payload) {
  const msg = new Uint8Array(1 + payload.length);
  msg[0] = type;
  msg.set(payload, 1);
  return msg;
}

/**
 * The single hook that wires Yjs + WebSocket + REST together.
 *
 * Returns:
 *   ydoc        – the shared Y.Doc, bound to Tiptap via Collaboration extension
 *   awareness   – Yjs Awareness instance for live cursors (CollaborationCursor)
 *   presenceUsers – plain React state array of {name, color} for the avatar list,
 *                   derived from awareness so Editor never has to touch awareness directly
 *   title / setTitle – document title with debounced REST save
 *   status      – "loading" | "connected" | "unsaved" | "saving" | "disconnected" | "error"
 */
export function useCollaborativeDoc(documentId) {
  // These refs are stable for the component lifetime. A fresh hook instance
  // is created per document because Editor is keyed by documentId in App.jsx.
  const ydoc = useRef(new Y.Doc()).current;
  const awareness = useRef(new Awareness(ydoc)).current;

  const [title, setTitleState] = useState("");
  const [status, setStatus] = useState("loading");
  // Plain React state so PresenceList can just render an array -- no need
  // for PresenceList to touch awareness directly, which avoids timing issues.
  const [presenceUsers, setPresenceUsers] = useState([]);

  const saveTimer = useRef(null);
  const titleTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let ws = null;

    // Set local identity immediately so PresenceList shows "you" before
    // anyone else joins. This fires the awareness "change" event which
    // updates presenceUsers via the listener below.
    const me = getIdentity();
    awareness.setLocalStateField("user", me);

    // Keep presenceUsers in sync with awareness state.
    const syncPresence = () => {
      const users = Array.from(awareness.getStates().values())
        .map((s) => s.user)
        .filter(Boolean);
      setPresenceUsers(users);
    };

    // Run once now (picks up the identity we just set above), then on
    // every future awareness change.
    syncPresence();
    awareness.on("change", syncPresence);

    // --- REST: load document ---
    getDocument(documentId).then((doc) => {
      if (cancelled) return;
      setTitleState(doc.title);
      if (doc.yjs_state) {
        Y.applyUpdate(ydoc, b64ToBytes(doc.yjs_state), "remote");
      }

      // --- WebSocket: relay Yjs updates + awareness ---
      ws = new WebSocket(`${WS_BASE}/ws/documents/${documentId}/`);
      ws.binaryType = "arraybuffer";

      const send = (type, payload) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(pack(type, payload));
      };

      ws.onopen = () => {
        setStatus("connected");
        // Announce ourselves to existing connections.
        send(MSG_AWARENESS, encodeAwarenessUpdate(awareness, [awareness.clientID]));
      };
      ws.onclose = () => !cancelled && setStatus("disconnected");
      ws.onerror = () => !cancelled && setStatus("disconnected");

      ws.onmessage = ({ data }) => {
        const bytes = new Uint8Array(data);
        const payload = bytes.subarray(1);
        if (bytes[0] === MSG_DOC) {
          Y.applyUpdate(ydoc, payload, "remote");
        } else if (bytes[0] === MSG_AWARENESS) {
          applyAwarenessUpdate(awareness, payload, "remote");
          // syncPresence is already wired to awareness "change" -- no need
          // to call it here manually.
        }
      };

      // Relay local doc edits + schedule REST snapshot.
      ydoc.on("update", (update, origin) => {
        if (origin === "remote") return;
        send(MSG_DOC, update);
        setStatus("unsaved");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          setStatus("saving");
          try {
            await updateDocument(documentId, {
              yjs_state: bytesToB64(Y.encodeStateAsUpdate(ydoc)),
            });
            setStatus(ws?.readyState === WebSocket.OPEN ? "connected" : "disconnected");
          } catch {
            setStatus("error");
          }
        }, SAVE_DELAY);
      });

      // Relay local awareness changes (cursor moves, etc.) to peers.
      awareness.on("update", ({ added, updated, removed }, origin) => {
        if (origin === "remote") return;
        send(MSG_AWARENESS, encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]));
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(saveTimer.current);
      clearTimeout(titleTimer.current);
      awareness.off("change", syncPresence);
      awareness.setLocalState(null);
      ws?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const setTitle = (value) => {
    setTitleState(value);
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      updateDocument(documentId, { title: value }).catch(console.error);
    }, SAVE_DELAY);
  };

  return { ydoc, awareness, presenceUsers, title, setTitle, status };
}
