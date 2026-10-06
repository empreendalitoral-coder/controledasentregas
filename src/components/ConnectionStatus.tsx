import { useEffect, useRef, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  const [reconnected, setReconnected] = useState(false);
  const wasOffline = useRef(false);
  const reconnectTimer = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => {
      const next = navigator.onLine;
      if (next && wasOffline.current) {
        setReconnected(true);
        if (reconnectTimer.current != null) window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = window.setTimeout(() => setReconnected(false), 3500);
      }
      if (!next) wasOffline.current = true;
      setOnline(next);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      if (reconnectTimer.current != null) window.clearTimeout(reconnectTimer.current);
    };
  }, []);

  if (online && !reconnected) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-md items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-lg ${
        online ? "border-success/40 bg-card text-success" : "border-warning/40 bg-card text-foreground"
      }`}
    >
      {online ? <Wifi className="size-4 shrink-0" /> : <CloudOff className="size-4 shrink-0 text-warning" />}
      <span>{online ? "Conexão restabelecida." : "Sem internet. Seus dados preenchidos serão mantidos para tentar novamente."}</span>
    </div>
  );
}