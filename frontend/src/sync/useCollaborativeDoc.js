import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";

import { getDocument, updateDocument } from "../api";
import { getIdentity } from "./identity";

const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:8000";
const SNAPSHOT_DELAY_MS = 2000;

// 1-byte message type prefix so the relay can carry both doc updates and
// awareness (presence/cursor) updates on the same WebSocket connection.
const MESSAGE_TYPE = { DOC_UPDATE: 0, AWARENESS_UPDATE: 1 };

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

function frame(type, payload) {
  const message = new Uint8Array(1 + payload.length);
  message[0] = type;
  message.set(payload, 1);
  return message;
}

export function useCollaborativeDoc(documentId) {
  const ydocRef = useRef(null);
  if (!ydocRef.current) ydocRef.current = new Y.Doc();
  const ydoc = ydocRef.current;

  const awarenessRef = useRef(null);
  if (!awarenessRef.current) awarenessRef.current = new Awareness(ydoc);
  const awareness = awarenessRef.current;

  const [title, setTitleState] = useState("");
  const [status, setStatus] = useState("loading");

  const snapshotTimer = useRef(null);
  const titleSaveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let ws = null;
    let handleLocalUpdate = null;
    let handleAwarenessUpdate = null;

    setStatus("loading");

    // Set identity immediately into the awareness doc (before the socket
    // opens) so that PresenceList can show "yourself" right away, and so
    // there's definitely a local state to broadcast the moment the socket
    // becomes available.
    const identity = getIdentity();
    awareness.setLocalStateField("user", identity);
    console.log("[presence] local identity set:", identity);

    const send = (type, payload) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(frame(type, payload));
    };

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

      ws.onopen = () => {
        setStatus("connected");
        console.log("[presence] ws open, broadcasting identity");
        // Broadcast our presence to everyone else now that the socket is up.
        send(
          MESSAGE_TYPE.AWARENESS_UPDATE,
          encodeAwarenessUpdate(awareness, [awareness.clientID])
        );
      };

      ws.onclose = () => setStatus("disconnected");
      ws.onerror = () => setStatus("disconnected");

      ws.onmessage = (event) => {
        const bytes = new Uint8Array(event.data);
        const type = bytes[0];
        const payload = bytes.subarray(1);
        if (type === MESSAGE_TYPE.DOC_UPDATE) {
          Y.applyUpdate(ydoc, payload, "remote");
        } else if (type === MESSAGE_TYPE.AWARENESS_UPDATE) {
          applyAwarenessUpdate(awareness, payload, "remote");
        }
      };

      handleLocalUpdate = (update, origin) => {
        if (origin === "remote") return;
        send(MESSAGE_TYPE.DOC_UPDATE, update);
        scheduleSnapshot();
      };
      ydoc.on("update", handleLocalUpdate);

      handleAwarenessUpdate = ({ added, updated, removed }, origin) => {
        if (origin === "remote") return;
        const changedClients = [...added, ...updated, ...removed];
        send(
          MESSAGE_TYPE.AWARENESS_UPDATE,
          encodeAwarenessUpdate(awareness, changedClients)
        );
      };
      awareness.on("update", handleAwarenessUpdate);
    });

    return () => {
      cancelled = true;
      if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      if (handleLocalUpdate) ydoc.off("update", handleLocalUpdate);
      if (handleAwarenessUpdate) awareness.off("update", handleAwarenessUpdate);
      awareness.setLocalState(null);
      if (ws) ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const setTitle = (value) => {
    setTitleState(value);
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => {
      updateDocument(documentId, { title: value }).catch(() =>
        console.error("Failed to save title")
      );
    }, SNAPSHOT_DELAY_MS);
  };

  return { ydoc, awareness, title, setTitle, status };
}
