const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

function getToken() { return localStorage.getItem("access_token"); }
export function setTokens(access, refresh) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}
export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}
export function isLoggedIn() { return !!getToken(); }

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearTokens();
    window.location.reload();
    return;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

export const register = (username, email, password) =>
  request("/auth/register/", { method: "POST", body: JSON.stringify({ username, email, password }) });

export const login = async (username, password) => {
  const data = await request("/auth/login/", {
    method: "POST", body: JSON.stringify({ username, password }),
    headers: {},   // no auth header for login
  });
  setTokens(data.access, data.refresh);
  return data;
};

export const getMe = () => request("/auth/me/");

export const listDocuments = () => request("/documents/");
export const getDocument = (id) => request(`/documents/${id}/`);
export const createDocument = (title) =>
  request("/documents/", { method: "POST", body: JSON.stringify({ title, content: {} }) });
export const updateDocument = (id, data) =>
  request(`/documents/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteDocument = (id) =>
  request(`/documents/${id}/`, { method: "DELETE" });
export const getCollaborators = (id) => request(`/documents/${id}/collaborators/`);
export const inviteCollaborator = (id, email, role) =>
  request(`/documents/${id}/invite/`, { method: "POST", body: JSON.stringify({ email, role }) });
