import { useState } from "react";
import { login, register } from "../api";

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(form.username, form.email, form.password);
      }
      await login(form.username, form.password);
      onAuth();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Collab Editor</h1>
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Log in</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Sign up</button>
        </div>

        <div className="auth-fields">
          <input className="auth-input" placeholder="Username" value={form.username} onChange={set("username")} />
          {mode === "register" && (
            <input className="auth-input" placeholder="Email" type="email" value={form.email} onChange={set("email")} />
          )}
          <input className="auth-input" placeholder="Password" type="password" value={form.password} onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="primary-button auth-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? "…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </div>
    </div>
  );
}
