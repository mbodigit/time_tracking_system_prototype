import { useEffect, useState, type ReactNode } from "react";
import { pingServer, subscribeConnection } from "../../api/client";

const RETRY_MS = 5000;

interface ConnectionGuardProps {
  children: ReactNode;
}

export const ConnectionGuard = ({ children }: ConnectionGuardProps) => {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(
    () =>
      subscribeConnection((online) => {
        setIsOffline(!online);
        if (!online) {
          setWasOffline(true);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!isOffline) {
      return;
    }

    let cancelled = false;

    const attempt = async () => {
      setIsChecking(true);
      const alive = await pingServer();
      if (!cancelled) {
        setIsChecking(false);
        if (alive) {
          setIsOffline(false);
        }
      }
    };

    const timer = window.setInterval(attempt, RETRY_MS);
    attempt();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOffline]);

  const retryNow = async () => {
    setIsChecking(true);
    const alive = await pingServer();
    setIsChecking(false);
    if (alive) {
      setIsOffline(false);
      window.location.reload();
    }
  };

  if (!isOffline) {
    return (
      <>
        {wasOffline && (
          <div className="alert alert-warning sticky top-0 z-50 rounded-none py-2 text-sm">
            <span>
              A kapcsolat megszakadt, majd helyreállt. A képernyőn látható
              adatok elavultak lehetnek.
            </span>
            <div className="flex gap-2">
              <button
                className="btn btn-xs btn-primary"
                onClick={() => window.location.reload()}
              >
                Frissítés
              </button>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => setWasOffline(false)}
              >
                Bezárás
              </button>
            </div>
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body items-center gap-4 text-center">
          <span className="loading loading-spinner loading-lg text-primary" />

          <h1 className="text-xl font-bold">A szerver nem érhető el</h1>

          <p className="text-sm opacity-70">
            A rendszer nem tud kapcsolódni a kiszolgálóhoz. Lehet, hogy
            karbantartás zajlik, vagy megszakadt a hálózati kapcsolat. Az
            újracsatlakozás automatikusan megtörténik, amint a szerver újra
            válaszol.
          </p>

          <p className="text-xs opacity-60">
            {isChecking
              ? "Kapcsolódás ellenőrzése..."
              : "Újrapróbálkozás néhány másodpercenként."}
          </p>

          <button
            className="btn btn-sm btn-primary"
            onClick={retryNow}
            disabled={isChecking}
          >
            Próbálkozás most
          </button>
        </div>
      </div>
    </div>
  );
};
