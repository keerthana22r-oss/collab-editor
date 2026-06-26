import { useEffect, useState } from "react";

export default function PresenceList({ awareness }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = Array.from(awareness.getStates().values());
      const found = states.map((s) => s.user).filter(Boolean);
      setUsers(found);
    };

    // Run immediately, then listen for any awareness change or update.
    // We listen to both events because setLocalStateField fires "update"
    // always, but "change" only when the value actually differs from the
    // previous state -- on first set (added), it fires both, but to be
    // safe we subscribe to both so we never miss a transition.
    updateUsers();
    awareness.on("change", updateUsers);
    awareness.on("update", updateUsers);

    // Belt-and-suspenders: re-read the state once after a short delay,
    // in case the ws.onopen callback fires between our two .on() calls
    // above and we lose the event.
    const timer = setTimeout(updateUsers, 500);

    return () => {
      awareness.off("change", updateUsers);
      awareness.off("update", updateUsers);
      clearTimeout(timer);
    };
  }, [awareness]);

  if (users.length === 0) return null;

  return (
    <div className="presence-list">
      {users.map((user, i) => (
        <span
          key={`${user.name}-${i}`}
          className="presence-avatar"
          style={{ background: user.color }}
          title={user.name}
        >
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </span>
      ))}
    </div>
  );
}
