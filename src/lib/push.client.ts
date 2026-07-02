/**
 * Bootstrap de push notifications no cliente (Capacitor Android/iOS nativo).
 * No navegador é NO-OP — não quebra a preview nem o build web.
 *
 * Uso: chame `initPushNotifications()` uma única vez após o usuário estar autenticado.
 */

let iniciado = false;

export async function initPushNotifications(): Promise<void> {
  if (iniciado || typeof window === "undefined") return;

  let Capacitor: typeof import("@capacitor/core").Capacitor;
  try {
    ({ Capacitor } = await import("@capacitor/core"));
  } catch {
    return;
  }
  if (!Capacitor.isNativePlatform()) return;
  iniciado = true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permStatus = await PushNotifications.checkPermissions();
    let perm = permStatus.receive;
    if (perm === "prompt" || perm === "prompt-with-rationale") {
      perm = (await PushNotifications.requestPermissions()).receive;
    }
    if (perm !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (t) => {
      try {
        const { registerDeviceToken } = await import("@/lib/notifications/send.functions");
        await registerDeviceToken({
          data: { token: t.value, plataforma: "android" },
        });
      } catch (e) {
        console.warn("[push] registerDeviceToken falhou", e);
      }
    });

    PushNotifications.addListener("registrationError", (e) => {
      console.warn("[push] registrationError", e);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const path = action.notification?.data?.path;
      if (typeof path === "string" && path.startsWith("/")) {
        window.location.assign(path);
      }
    });
  } catch (e) {
    console.warn("[push] init falhou", e);
  }
}
