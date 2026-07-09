import type { DevInspectorFirebaseConfig } from "./types";

/**
 * Lazily-loaded Firebase handles. `firebase` is only ever imported when
 * Comment mode is actually activated, keeping the base bundle small for
 * consumers who never opt into `comments`.
 */
export type FirebaseHandles = {
  app: import("firebase/app").FirebaseApp;
  auth: import("firebase/auth").Auth;
  db: import("firebase/firestore").Firestore;
  functionsUrl: (name: string) => string;
};

export type GetFirebaseOptions = {
  config: DevInspectorFirebaseConfig;
  region?: string;
  /** Connect Auth + Firestore to local emulators (127.0.0.1). */
  useEmulators?: boolean;
};

const AUTH_EMULATOR_HOST = "http://127.0.0.1:9099";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1";
const FIRESTORE_EMULATOR_PORT = 8080;
const FUNCTIONS_EMULATOR_HOST = "127.0.0.1";
const FUNCTIONS_EMULATOR_PORT = 5001;

let cached: Promise<FirebaseHandles> | null = null;
let cachedKey: string | null = null;

function cacheKey(config: DevInspectorFirebaseConfig, useEmulators: boolean): string {
  return `${config.projectId}:${config.appId}:${useEmulators ? "emu" : "prod"}`;
}

/**
 * Idempotently initializes (or reuses) the Firebase app for the given
 * config, and returns Auth + Firestore handles. Safe to call repeatedly;
 * re-initializes only if the config identity changes.
 */
export async function getFirebaseHandles(
  config: DevInspectorFirebaseConfig,
  region?: string,
): Promise<FirebaseHandles>;
export async function getFirebaseHandles(
  options: GetFirebaseOptions,
): Promise<FirebaseHandles>;
export async function getFirebaseHandles(
  configOrOptions: DevInspectorFirebaseConfig | GetFirebaseOptions,
  legacyRegion = "us-central1",
): Promise<FirebaseHandles> {
  const options: GetFirebaseOptions =
    "config" in configOrOptions
      ? configOrOptions
      : { config: configOrOptions, region: legacyRegion, useEmulators: false };

  const { config, region = "us-central1", useEmulators = false } = options;
  const key = cacheKey(config, useEmulators);
  if (cached && cachedKey === key) return cached;

  cachedKey = key;
  cached = (async () => {
    const [
      { getApps, getApp, initializeApp },
      { getAuth, connectAuthEmulator },
      { getFirestore, connectFirestoreEmulator },
    ] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore"),
    ]);

    const app = getApps().length ? getApp() : initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);

    if (useEmulators) {
      connectAuthEmulator(auth, AUTH_EMULATOR_HOST, { disableWarnings: true });
      connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    }

    const functionsUrl = (name: string) =>
      useEmulators
        ? `http://${FUNCTIONS_EMULATOR_HOST}:${FUNCTIONS_EMULATOR_PORT}/${config.projectId}/${region}/${name}`
        : `https://${region}-${config.projectId}.cloudfunctions.net/${name}`;

    return { app, auth, db, functionsUrl };
  })();

  return cached;
}

/** Demo web config that works with Firebase emulators (no real project needed). */
export function demoFirebaseConfig(projectId = "demo-dev-inspector"): DevInspectorFirebaseConfig {
  return {
    apiKey: "demo-key",
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    appId: "1:demo:web:demo",
  };
}
