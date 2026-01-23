import { useAuth } from "./useAuth";

export function UserMenu() {
  const { sessionEmail, signOut, error, loading } = useAuth(); // assuming useAuth exposes error/loading if needed, or we just rely on parent

  if (loading) return null;

  return (
    <div className="section">
      {/* This was part of a card in App.tsx but likely fits better as a standalone or part of header */}
      <div className="row">
        <h2>Account</h2>
        <button onClick={signOut}>Sign out</button>
      </div>
      <p className="muted">Signed in as {sessionEmail}</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
