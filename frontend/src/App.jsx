import { useState } from "react";

import DocumentList from "./components/DocumentList";
import Editor from "./components/Editor";

export default function App() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="app-shell">
      {openId ? (
        <Editor key={openId} documentId={openId} onBack={() => setOpenId(null)} />
      ) : (
        <DocumentList onOpen={setOpenId} />
      )}
    </div>
  );
}
