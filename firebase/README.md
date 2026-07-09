# Dev Inspector Comments — Firebase backend

Each host app brings its **own** Firebase project. Copy this `firebase/` folder (or symlink) into your app and deploy.

## Quick start — Spark + emulators (no Blaze, no email)

Try the full Comments UI locally with a **mock OTP** (`000000`). No Cloud Functions deploy needed.

### 1. Install Firebase CLI (once)

```bash
npm install -g firebase-tools
firebase login
```

### 2. Point at a demo project id

```bash
cd firebase
cp .firebaserc.example .firebaserc
```

Edit `.firebaserc` and set:

```json
{
  "projects": {
    "default": "demo-dev-inspector"
  }
}
```

(`demo-dev-inspector` is a fake id — emulators accept it; no real Firebase project required.)

### 3. Start emulators (Auth + Firestore only)

```bash
cd firebase
firebase emulators:start --only auth,firestore
```

Leave this terminal open. Emulator UI: http://localhost:4000

### 4. Enable Comments in the playground

```bash
cd playground
cp .env.example .env
cd ..
npm run playground
```

Open http://localhost:5175

### 5. Sign in with mock OTP

1. Open dock → **Comment**
2. Email: `you@birdeye.com`
3. **Send code** (no email is sent)
4. Enter **`000000`** → **Verify**
5. Post comments, pin to elements, replies, etc.

Data lives in the local Firestore emulator (wiped when emulators stop).

### Props used in dev

```tsx
import { DevInspector, demoFirebaseConfig } from "@balajik-cmyk/dev-inspector";

<DevInspector
  comments
  firebaseConfig={demoFirebaseConfig("demo-dev-inspector")}
  commentsUseEmulators
  commentsMockOtp
/>
```

| Prop | Purpose |
|------|---------|
| `commentsUseEmulators` | Auth → `127.0.0.1:9099`, Firestore → `127.0.0.1:8080` |
| `commentsMockOtp` | Skip OTP Functions; accept `000000` (override with `commentsMockOtpCode`) |

---

## Production checklist (Blaze)

1. Create a Firebase project and upgrade to **Blaze**.
2. Enable **Firestore**.
3. Install **Trigger Email** + **SMTP / SendGrid**.
4. Deploy rules + functions:

```bash
cd firebase/functions && npm install && npm run build
cd .. && firebase deploy --only firestore:rules,functions
```

5. Pass real `firebaseConfig` (no `commentsMockOtp` / `commentsUseEmulators`).

## Emulator with real OTP Functions (optional)

If you want to test the real `requestOtp` / `verifyOtp` flow locally:

```bash
cd firebase/functions && npm install && npm run build
cd .. && firebase emulators:start --only auth,firestore,functions
```

OTP is logged in the terminal: `[requestOtp] OTP for you@birdeye.com: 123456`

Use `commentsUseEmulators` **without** `commentsMockOtp`, and enter the logged code.

## Rate limits (production)

| Scope | Limit |
|-------|--------|
| Per email | 1 / 60s, 10 / day |
| Per IP | 5 / 60s, 50 / day |
| Verify attempts | 5 per code |

## Collections

- `otpRequests/{email}` — hashed OTP (Admin only)
- `otpRateLimits/{key}` — IP counters (Admin only)
- `mail/{id}` — Trigger Email queue
- `users/{uid}` — profile
- `pages/{pageId}/comments/...` — threads, replies, reactions

See `firestore.rules` for auth + reply cap (max 10).
