const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const listDocuments = () => request("/documents/");

export const getDocument = (id) => request(`/documents/${id}/`);

export const createDocument = (title) =>
  request("/documents/", {
    method: "POST",
    body: JSON.stringify({ title, content: {} }),
  });

export const updateDocument = (id, data) =>
  request(`/documents/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteDocument = (id) =>
  request(`/documents/${id}/`, { method: "DELETE" });
