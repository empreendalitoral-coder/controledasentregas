/**
 * Bootstrap de push notifications no cliente (Capacitor Android/iOS nativo).
 * No navegador: NO-OP para envio real, mas mantém um "status" observável
 * para as telas de diagnóstico funcionarem em ambos os ambientes.
 */

export type PushStatus = {
  isNative: boolean;
  capacitorReady: boolean;
  pluginReady: boolean;
  permission: "granted" | "denied" | "prompt" | "prompt-with-rationale" | "unknown";
  token: string | null;
  lastUpdated: string | null;
  lastError: string | null;
};

const state: PushStatus = {
  isNative: false,
  capacitorReady: false,
  pluginReady: false,
  permission: "unknown",
  token: null,
  lastUpdated: null,
  lastError: null,
};

const listeners = new Set<(s: PushStatus) => void>();
function emit() {
  const snap = { ...state };
  listeners.forEach((l) => l(snap));
}

export function getPushStatus(): PushStatus {
  return { ...state };
}

export function subscribePushStatus(cb: (s: PushStatus) => void): () => void {
  listeners.add(cb);
  cb({ ...state });
  return () => listeners.delete(cb);
}

let iniciado = false;

export async function initPushNotifications(): Promise<void> {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;

  let Capacitor: typeof import("@capacitor/core").Capacitor;
  try {
    ({ Capacitor } = await import("@capacitor/core"));
    state.capacitorReady = true;
  } catch (e) {
    state.lastError = e instanceof Error ? e.message : String(e);
    emit();
    return;
  }
  state.isNative = Capacitor.isNativePlatform();
  emit();
  if (!state.isNative) return;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    state.pluginReady = true;

    const permStatus = await PushNotifications.checkPermissions();
    state.permission = permStatus.receive;
    emit();

    if (state.permission === "prompt" || state.permission === "prompt-with-rationale") {
      const r = await PushNotifications.requestPermissions();
      state.permission = r.receive;
      emit();
    }
    if (state.permission !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (t) => {
      state.token = t.value;
      state.lastUpdated = new Date().toISOString();
      state.lastError = null;
      emit();
      try {
        const { registerDeviceToken } = await import("@/lib/notifications/send.functions");
        await registerDeviceToken({
          data: { token: t.value, plataforma: "android" },
        });
      } catch (e) {
        state.lastError = e instanceof Error ? e.message : String(e);
        emit();
        console.warn("[push] registerDeviceToken falhou", e);
      }
    });

    PushNotifications.addListener("registrationError", (e) => {
      state.lastError = typeof e === "object" ? JSON.stringify(e) : String(e);
      emit();
      console.warn("[push] registrationError", e);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const path = action.notification?.data?.path;
      if (typeof path === "string" && path.startsWith("/")) {
        window.location.assign(path);
      }
    });
  } catch (e) {
    state.lastError = e instanceof Error ? e.message : String(e);
    emit();
    console.warn("[push] init falhou", e);
  }
}
