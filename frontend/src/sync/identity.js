const COLORS = ["#E03131","#1971C2","#2F9E44","#F08C00","#9C36B5","#0CA678"];
const NAMES = ["Alice","Bob","Carol","Dave","Eve","Frank","Grace","Hana","Ivan","Jess"];

export function getIdentity() {
  const stored = sessionStorage.getItem("collab-identity");
  if (stored) return JSON.parse(stored);
  const identity = {
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  sessionStorage.setItem("collab-identity", JSON.stringify(identity));
  return identity;
}
