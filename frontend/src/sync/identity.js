const COLORS = [
  "#E07A5F",
  "#3D5A80",
  "#81B29A",
  "#F2CC8F",
  "#9B5DE5",
  "#00B4D8",
  "#EF767A",
];

const STORAGE_KEY = "collab-editor-identity";

/**
 * Returns a stable { name, color } for this browser tab/window.
 *
 * Uses sessionStorage (not localStorage) deliberately: sessionStorage is
 * scoped per tab, so opening a second window to test presence/live cursors
 * gets a genuinely different guest identity instead of silently reusing
 * the first window's name. Once Phase 4 adds real accounts, this becomes
 * unnecessary -- identity comes from the logged-in user instead.
 */
export function getIdentity() {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);

  const identity = {
    name: `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}
