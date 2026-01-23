import { usePWAInstall } from "./usePWAInstall";

export function InstallPrompt() {
  const { isInstalled, canInstall, promptInstall } = usePWAInstall();

  if (isInstalled || window.location.pathname.startsWith("/join")) return null;

  return (
    <section className="card install">
      <h2>Install</h2>
      <p className="muted">Install the app to continue.</p>
      {canInstall ? (
        <button onClick={promptInstall}>Install app</button>
      ) : (
        <div className="install-guide">
          <img
            src="/assets/install/install-guide.svg"
            alt="Install guidance"
            className="install-image"
          />
          <p className="muted">
            Use your browser menu to add this app to your home screen.
          </p>
        </div>
      )}
    </section>
  );
}
