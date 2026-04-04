const encoder = new TextEncoder();

function base64UrlEncode(data: Uint8Array) {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const normalized = pad ? padded + "=".repeat(4 - pad) : padded;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getSecret() {
  return encoder.encode(process.env.JWT_SECRET || "dev-secret");
}

export type AuthRole = "hospital" | "doctor" | "patient";

export async function signToken(payload: { sub: string; role: AuthRole }) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60;
  const body = { role: payload.role, sub: payload.sub, iat: now, exp };

  const headerPart = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const bodyPart = base64UrlEncode(encoder.encode(JSON.stringify(body)));
  const data = encoder.encode(`${headerPart}.${bodyPart}`);

  const key = await crypto.subtle.importKey(
    "raw",
    getSecret(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const signaturePart = base64UrlEncode(new Uint8Array(signature));

  return `${headerPart}.${bodyPart}.${signaturePart}`;
}

export async function verifyToken(token: string) {
  const [headerPart, bodyPart, signaturePart] = token.split(".");
  if (!headerPart || !bodyPart || !signaturePart) {
    throw new Error("Invalid token");
  }

  const data = encoder.encode(`${headerPart}.${bodyPart}`);
  const key = await crypto.subtle.importKey(
    "raw",
    getSecret(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signaturePart),
    data
  );
  if (!isValid) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(bodyPart)));
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error("Token expired");
  }
  return payload;
}
