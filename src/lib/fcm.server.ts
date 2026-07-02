/**
 * Cliente FCM HTTP v1 usando Service Account JSON.
 * Server-only: NUNCA importar do bundle do cliente.
 *
 * Espera o secret `FIREBASE_SERVICE_ACCOUNT_JSON` (conteúdo do JSON da service account).
 * Enquanto o secret não estiver configurado, `sendFcmMessage` retorna
 * `{ ok: false, notConfigured: true }` sem lançar erro — permite integração progressiva.
 */

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type FcmPayload = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

let cachedSa: ServiceAccount | null | undefined;
let cachedToken: { value: string; exp: number } | null = null;

function loadServiceAccount(): ServiceAccount | null {
  if (cachedSa !== undefined) return cachedSa;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    cachedSa = null;
    return null;
  }
  try {
    cachedSa = JSON.parse(raw) as ServiceAccount;
    return cachedSa;
  } catch (e) {
    console.error("[fcm] FIREBASE_SERVICE_ACCOUNT_JSON invalido", e);
    cachedSa = null;
    return null;
  }
}

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claim))}`;

  const keyData = pemToArrayBuffer(sa.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64UrlEncode(sig)}`;

  const res = await fetch(claim.aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`[fcm] token oauth falhou: ${res.status} ${await res.text()}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: j.access_token, exp: now + j.expires_in };
  return j.access_token;
}

export type FcmSendResult =
  | { ok: true }
  | { ok: false; notConfigured?: true; invalidToken?: true; error: string };

export async function sendFcmMessage(payload: FcmPayload): Promise<FcmSendResult> {
  const sa = loadServiceAccount();
  if (!sa) return { ok: false, notConfigured: true, error: "FIREBASE_SERVICE_ACCOUNT_JSON ausente" };

  try {
    const token = await getAccessToken(sa);
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: payload.token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
            android: {
              priority: "HIGH",
              notification: { channel_id: "entrega_pro_default" },
            },
          },
        }),
      },
    );
    if (res.ok) return { ok: true };
    const body = await res.text();
    const invalid =
      res.status === 404 ||
      body.includes("UNREGISTERED") ||
      body.includes("INVALID_ARGUMENT") ||
      body.includes("registration-token-not-registered");
    return { ok: false, invalidToken: invalid, error: `${res.status} ${body.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function isFcmConfigured(): boolean {
  return loadServiceAccount() !== null;
}
