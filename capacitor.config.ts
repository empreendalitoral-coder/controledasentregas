import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuração do Capacitor para build Android nativo (Play Store).
 * Após ajustar server.url para a URL de dev/prod desejada, rode:
 *   bunx cap add android
 *   bunx cap sync android
 *   bunx cap open android
 */
const config: CapacitorConfig = {
  appId: "app.entregapro.mobile",
  appName: "Entrega Pro",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
