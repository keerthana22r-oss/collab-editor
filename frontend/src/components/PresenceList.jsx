export default function PresenceList({ users }) {
  if (!users || users.length === 0) return null;
  return (
    <div className="presence-list">
      {users.map((user, i) => (
        <span
          key={i}
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
