import * as React from "react";
import { getFirebaseHandles } from "./firebaseClient";
import type { CommentAuthUser, DevInspectorFirebaseConfig } from "./types";
import {
  DEFAULT_ALLOWED_EMAIL_DOMAIN,
  DEFAULT_FUNCTIONS_REGION,
  DEFAULT_MOCK_OTP,
} from "./types";

export type AuthStep = "email" | "otp";

export type UseAuthOptions = {
  firebaseConfig: DevInspectorFirebaseConfig;
  functionsRegion?: string;
  allowedEmailDomain?: string;
  useEmulators?: boolean;
  /** Dev only: skip OTP Functions; accept `mockOtpCode` (default 000000). */
  mockOtp?: boolean;
  mockOtpCode?: string;
  onAuthChange?: (user: CommentAuthUser | null) => void;
};

export type UseAuthResult = {
  user: CommentAuthUser | null;
  ready: boolean;
  step: AuthStep;
  email: string;
  setEmail: (value: string) => void;
  emailError: string | null;
  otp: string;
  setOtp: (value: string) => void;
  sending: boolean;
  verifying: boolean;
  serverError: string | null;
  sentTo: string | null;
  mockOtp: boolean;
  mockOtpCode: string;
  requestCode: () => Promise<void>;
  verifyCode: () => Promise<void>;
  resetToEmailStep: () => void;
  signOut: () => Promise<void>;
};

const MOCK_AUTH_PASSWORD = "dev-inspector-mock-otp";

function isAllowedEmail(email: string, domain: string): boolean {
  const normalized = email.trim().toLowerCase();
  const suffix = `@${domain.trim().toLowerCase()}`;
  return normalized.endsWith(suffix) && normalized.length > suffix.length;
}

async function mockEmulatorSignIn(
  auth: import("firebase/auth").Auth,
  email: string,
): Promise<void> {
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword } =
    await import("firebase/auth");
  try {
    await signInWithEmailAndPassword(auth, email, MOCK_AUTH_PASSWORD);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (
      code === "auth/user-not-found" ||
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password"
    ) {
      await createUserWithEmailAndPassword(auth, email, MOCK_AUTH_PASSWORD);
      return;
    }
    throw err;
  }
}

/**
 * Email OTP auth for Comments. Only emails ending in `allowedEmailDomain`
 * (default `birdeye.com`) may request/verify a code — enforced here (hint +
 * hard block, no network call) and again server-side in Cloud Functions.
 *
 * Set `mockOtp` + `useEmulators` for local Spark-friendly testing (code `000000`).
 */
export function useAuth({
  firebaseConfig,
  functionsRegion = DEFAULT_FUNCTIONS_REGION,
  allowedEmailDomain = DEFAULT_ALLOWED_EMAIL_DOMAIN,
  useEmulators = false,
  mockOtp = false,
  mockOtpCode = DEFAULT_MOCK_OTP,
  onAuthChange,
}: UseAuthOptions): UseAuthResult {
  const [user, setUser] = React.useState<CommentAuthUser | null>(null);
  const [ready, setReady] = React.useState(false);
  const [step, setStep] = React.useState<AuthStep>("email");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    getFirebaseHandles({ config: firebaseConfig, region: functionsRegion, useEmulators }).then(
      async (handles) => {
        if (cancelled) return;
        const { onAuthStateChanged } = await import("firebase/auth");
        unsubscribe = onAuthStateChanged(handles.auth, (fbUser) => {
          const nextUser = fbUser?.email
            ? { uid: fbUser.uid, email: fbUser.email }
            : null;
          setUser(nextUser);
          setReady(true);
          onAuthChange?.(nextUser);
        });
      },
    );

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseConfig.projectId, firebaseConfig.appId, functionsRegion, useEmulators]);

  const emailError = React.useMemo(() => {
    if (!email) return null;
    return isAllowedEmail(email, allowedEmailDomain)
      ? null
      : `Only @${allowedEmailDomain} emails can comment`;
  }, [email, allowedEmailDomain]);

  const requestCode = React.useCallback(async () => {
    const normalized = email.trim().toLowerCase();
    if (!isAllowedEmail(normalized, allowedEmailDomain)) return;
    setSending(true);
    setServerError(null);
    try {
      if (mockOtp) {
        setSentTo(normalized);
        setStep("otp");
        return;
      }

      const handles = await getFirebaseHandles({
        config: firebaseConfig,
        region: functionsRegion,
        useEmulators,
      });
      const res = await fetch(handles.functionsUrl("requestOtp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data?.error ?? "Could not send code — try again");
        return;
      }
      setSentTo(normalized);
      setStep("otp");
    } catch {
      setServerError(
        useEmulators
          ? "Could not reach Functions emulator — is it running?"
          : "Could not reach the server — try again",
      );
    } finally {
      setSending(false);
    }
  }, [
    email,
    allowedEmailDomain,
    firebaseConfig,
    functionsRegion,
    mockOtp,
    useEmulators,
  ]);

  const verifyCode = React.useCallback(async () => {
    const normalized = (sentTo ?? email).trim().toLowerCase();
    if (!isAllowedEmail(normalized, allowedEmailDomain)) return;
    if (!otp || otp.length < 6) return;
    setVerifying(true);
    setServerError(null);
    try {
      const handles = await getFirebaseHandles({
        config: firebaseConfig,
        region: functionsRegion,
        useEmulators,
      });

      if (mockOtp) {
        if (otp.trim() !== mockOtpCode) {
          setServerError(`Dev mode: use code ${mockOtpCode}`);
          return;
        }
        await mockEmulatorSignIn(handles.auth, normalized);
        setOtp("");
        return;
      }

      const res = await fetch(handles.functionsUrl("verifyOtp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, code: otp.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        setServerError(data?.error ?? "Invalid or expired code");
        return;
      }
      const { signInWithCustomToken } = await import("firebase/auth");
      await signInWithCustomToken(handles.auth, data.token);
      setOtp("");
    } catch {
      setServerError("Could not verify code — try again");
    } finally {
      setVerifying(false);
    }
  }, [
    otp,
    sentTo,
    email,
    allowedEmailDomain,
    firebaseConfig,
    functionsRegion,
    mockOtp,
    mockOtpCode,
    useEmulators,
  ]);

  const resetToEmailStep = React.useCallback(() => {
    setStep("email");
    setOtp("");
    setServerError(null);
  }, []);

  const signOutFn = React.useCallback(async () => {
    const handles = await getFirebaseHandles({
      config: firebaseConfig,
      region: functionsRegion,
      useEmulators,
    });
    const { signOut } = await import("firebase/auth");
    await signOut(handles.auth);
    setStep("email");
    setEmail("");
    setOtp("");
    setSentTo(null);
  }, [firebaseConfig, functionsRegion, useEmulators]);

  return {
    user,
    ready,
    step,
    email,
    setEmail,
    emailError,
    otp,
    setOtp,
    sending,
    verifying,
    serverError,
    sentTo,
    mockOtp,
    mockOtpCode,
    requestCode,
    verifyCode,
    resetToEmailStep,
    signOut: signOutFn,
  };
}
