import { useEffect, useState } from "react";
import { clearTokens, isLoggedIn } from "./api";
import AuthPage from "./auth/AuthPage";
import DocumentList from "./components/DocumentList";
import Editor from "./components/Editor";

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [openId, setOpenId] = useState(null);

  useEffect(() => { setAuthed(isLoggedIn()); }, []);

  const handleLogout = () => { clearTokens(); setAuthed(false); setOpenId(null); };

  if (!authed) return <AuthPage onAuth={() => setAuthed(true)} />;

  return (
    <div className="app-shell">
      {openId ? (
        <Editor key={openId} documentId={openId} onBack={() => setOpenId(null)} />
      ) : (
        <DocumentList onOpen={setOpenId} onLogout={handleLogout} />
      )}
    </div>
  );
}
