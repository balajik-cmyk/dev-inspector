import * as crypto from "node:crypto";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { logger } from "firebase-functions";

setGlobalOptions({ region: "us-central1" });

admin.initializeApp();
const db = admin.firestore();

/** Must match client default `commentsAllowedEmailDomain` unless overridden. */
const ALLOWED_EMAIL_DOMAIN =
  process.env.COMMENTS_ALLOWED_EMAIL_DOMAIN || "birdeye.com";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const PER_EMAIL_COOLDOWN_MS = 60_000;
const PER_EMAIL_DAILY = 10;
const PER_IP_COOLDOWN_WINDOW_MS = 60_000;
const PER_IP_COOLDOWN_MAX = 5;
const PER_IP_DAILY = 50;

type OtpDoc = {
  hash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
  lastSentAt: number;
  dayKey: string;
  dayCount: number;
};

function cors(res: { set: (k: string, v: string) => void }) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const suffix = `@${ALLOWED_EMAIL_DOMAIN.trim().toLowerCase()}`;
  return normalized.endsWith(suffix) && normalized.length > suffix.length;
}

function dayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function hashCode(code: string, salt: string): string {
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function clientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.ip || "unknown";
}

function json(
  res: {
    status: (n: number) => { json: (b: unknown) => void };
  },
  status: number,
  body: unknown,
) {
  res.status(status).json(body);
}

async function checkIpLimits(ip: string, now: number): Promise<string | null> {
  const ref = db.collection("otpRateLimits").doc(`ip_${ip.replace(/\W/g, "_")}`);
  const snap = await ref.get();
  const data = snap.data() as
    | { windowStart?: number; windowCount?: number; dayKey?: string; dayCount?: number }
    | undefined;

  const windowStart = data?.windowStart ?? 0;
  let windowCount = data?.windowCount ?? 0;
  let dKey = data?.dayKey ?? dayKey(now);
  let dayCount = data?.dayCount ?? 0;

  if (now - windowStart > PER_IP_COOLDOWN_WINDOW_MS) {
    windowCount = 0;
  }
  if (dKey !== dayKey(now)) {
    dKey = dayKey(now);
    dayCount = 0;
  }

  if (windowCount >= PER_IP_COOLDOWN_MAX) {
    return "Too many codes — try again in a minute";
  }
  if (dayCount >= PER_IP_DAILY) {
    return "Daily OTP limit reached for this network";
  }

  await ref.set(
    {
      windowStart: windowCount === 0 ? now : windowStart || now,
      windowCount: windowCount + 1,
      dayKey: dKey,
      dayCount: dayCount + 1,
    },
    { merge: true },
  );
  return null;
}

export const requestOtp = onRequest({ cors: true }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const emailRaw = String(req.body?.email ?? "");
  const email = emailRaw.trim().toLowerCase();
  if (!isAllowedEmail(email)) {
    json(res, 403, { error: `Only @${ALLOWED_EMAIL_DOMAIN} emails can comment` });
    return;
  }

  const now = Date.now();
  const ip = clientIp(req as never);
  const ipError = await checkIpLimits(ip, now);
  if (ipError) {
    json(res, 429, { error: ipError });
    return;
  }

  const otpRef = db.collection("otpRequests").doc(email);
  const existing = (await otpRef.get()).data() as OtpDoc | undefined;

  if (existing?.lastSentAt && now - existing.lastSentAt < PER_EMAIL_COOLDOWN_MS) {
    json(res, 429, { error: "Too many codes — try again in a minute" });
    return;
  }

  const dKey = dayKey(now);
  const dayCount =
    existing?.dayKey === dKey ? (existing.dayCount ?? 0) : 0;
  if (dayCount >= PER_EMAIL_DAILY) {
    json(res, 429, { error: "Daily OTP limit reached for this email" });
    return;
  }

  const code = generateCode();
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashCode(code, salt);

  await otpRef.set({
    hash,
    salt,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    createdAt: now,
    lastSentAt: now,
    dayKey: dKey,
    dayCount: dayCount + 1,
  } satisfies OtpDoc);

  // Trigger Email extension reads `mail` collection.
  await db.collection("mail").add({
    to: [email],
    message: {
      subject: "Your Dev Inspector comment code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
    },
  });

  // Emulator / missing SMTP: always log so local testing works.
  logger.info(`[requestOtp] OTP for ${email}: ${code}`);

  json(res, 200, { ok: true });
});

export const verifyOtp = onRequest({ cors: true }, async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const code = String(req.body?.code ?? "").trim();

  if (!isAllowedEmail(email)) {
    json(res, 403, { error: `Only @${ALLOWED_EMAIL_DOMAIN} emails can comment` });
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    json(res, 400, { error: "Invalid or expired code" });
    return;
  }

  const otpRef = db.collection("otpRequests").doc(email);
  const snap = await otpRef.get();
  const data = snap.data() as OtpDoc | undefined;
  if (!data) {
    json(res, 400, { error: "Invalid or expired code" });
    return;
  }

  const now = Date.now();
  if (now > data.expiresAt) {
    await otpRef.delete();
    json(res, 400, { error: "Invalid or expired code" });
    return;
  }
  if ((data.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    json(res, 429, { error: "Too many attempts — request a new code" });
    return;
  }

  const expected = hashCode(code, data.salt);
  if (expected !== data.hash) {
    await otpRef.update({ attempts: (data.attempts ?? 0) + 1 });
    json(res, 400, { error: "Invalid or expired code" });
    return;
  }

  await otpRef.delete();

  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch {
    user = await admin.auth().createUser({ email, emailVerified: true });
  }

  await db.collection("users").doc(user.uid).set(
    {
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const token = await admin.auth().createCustomToken(user.uid, {
    email,
  });

  json(res, 200, { token });
});
