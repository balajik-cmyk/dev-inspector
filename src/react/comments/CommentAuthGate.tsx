import * as React from "react";
import styles from "../../styles/inspector.module.css";
import type { UseAuthResult } from "./useAuth";

export type CommentAuthGateProps = {
  auth: UseAuthResult;
  allowedEmailDomain: string;
};

/**
 * Auth gate for Comment mode: email step (allowlist-checked client-side)
 * then a 6-digit OTP step. Rendered in place of the threads list until
 * `auth.user` is set.
 */
export function CommentAuthGate({ auth, allowedEmailDomain }: CommentAuthGateProps) {
  const {
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
    requestCode,
    verifyCode,
    resetToEmailStep,
  } = auth;

  if (step === "otp") {
    return (
      <div className={styles.commentAuthGate}>
        <p className={styles.commentAuthHint}>
          Code sent to <strong>{sentTo}</strong>
        </p>
        {auth.mockOtp ? (
          <p className={styles.commentAuthHint}>
            Dev mode: enter <strong>{auth.mockOtpCode}</strong> (no email sent)
          </p>
        ) : null}
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          className={styles.commentOtpInput}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && otp.length === 6) verifyCode();
          }}
        />
        {serverError ? (
          <p className={styles.commentAuthError}>{serverError}</p>
        ) : null}
        <div className={styles.commentAuthActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            onClick={resetToEmailStep}
          >
            Back
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
            disabled={verifying || otp.length !== 6}
            onClick={verifyCode}
          >
            {verifying ? "Verifying…" : "Verify"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.commentAuthGate}>
      <p className={styles.commentAuthHint}>
        Use your @{allowedEmailDomain} email
      </p>
      <input
        type="email"
        placeholder={`you@${allowedEmailDomain}`}
        className={styles.commentEmailInput}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !emailError && email) requestCode();
        }}
      />
      {emailError ? (
        <p className={styles.commentAuthError}>{emailError}</p>
      ) : null}
      {serverError ? (
        <p className={styles.commentAuthError}>{serverError}</p>
      ) : null}
      <div className={styles.commentAuthActions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
          disabled={sending || !email || Boolean(emailError)}
          onClick={requestCode}
        >
          {sending ? "Sending…" : "Send code"}
        </button>
      </div>
    </div>
  );
}
