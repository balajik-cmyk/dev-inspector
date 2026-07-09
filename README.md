# @balajik-cmyk/dev-inspector

Drop-in React dev inspector — computed CSS, Figma-style spacing measurement, Agentation-style annotations, and optional Firebase-backed comments.

## Install

```bash
npm install @balajik-cmyk/dev-inspector -D
```

No token or registry setup needed — this is published to the public npm registry. To pick up a new release later, run `npm install @balajik-cmyk/dev-inspector@latest -D`.

Peer dependencies: `react >= 18`, `react-dom >= 18`.

## Usage

```tsx
import { DevInspector } from "@balajik-cmyk/dev-inspector";

function App() {
  return (
    <>
      <YourApp />
      {import.meta.env.DEV && (
        <DevInspector captureMode="alt-click" />
      )}
    </>
  );
}
```

Styles are injected automatically when you import the component. You can also import styles explicitly:

```tsx
import "@balajik-cmyk/dev-inspector/styles.css";
```

## Features

- **CSS inspector** — computed layout, typography, background, border, effects, and motion
- **Figma spacing** — neighbor bands on hover; distance guides between two picked elements
- **Annotations** — add notes on picked elements; copy structured markdown for AI agents
- **Comments (opt-in)** — BYO Firebase: email OTP, page/element pins, replies, reactions
- **Radix-safe capture** — default `alt-click` mode lets normal clicks pass through

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Kill switch |
| `captureMode` | `"alt-click" \| "armed-click"` | `"alt-click"` | Alt+click vs click-when-armed |
| `storageKey` | `string` | `"dev_inspector_armed"` | sessionStorage key for armed state |
| `zIndex` | `number` | `9999` | Overlay stacking |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Panel theme |
| `layout` | `"widget" \| "classic"` | `"widget"` | Chat-widget launcher vs legacy button stack |
| `offsetBottom` | `number` | `24` | Bottom offset for widget dock (px) |
| `offsetRight` | `number` | `24` | Right offset for widget dock (px) |
| `onAnnotationAdd` | `(a: Annotation) => void` | — | Hook when annotation saved |
| `onCopy` | `(markdown: string) => void` | — | Hook when user copies |
| `copyToClipboard` | `boolean` | `true` | Write to clipboard on copy |
| `comments` | `boolean` | `false` | Enable Comments mode (needs `firebaseConfig`) |
| `firebaseConfig` | `DevInspectorFirebaseConfig` | — | Firebase web config for Comments |
| `commentsFunctionsRegion` | `string` | `"us-central1"` | Cloud Functions region |
| `commentsAllowedEmailDomain` | `string` | `"birdeye.com"` | OTP email allowlist domain |
| `commentsPageUrl` | `string` | — | Explicit router URL for `pageId` (SPA) |
| `commentsHideShortcut` | `string \| false` | `"Shift+C"` | Hide pins + drawer; `false` disables |
| `onCommentAdd` | `(c: Comment) => void` | — | Hook when a comment is posted |
| `onCommentAuthChange` | `(user \| null) => void` | — | Auth session changes |

## Comments backend setup

Comments are **opt-in** and use **your** Firebase project (Auth + Firestore + Functions). Deploy the templates in [`firebase/`](firebase/README.md):

1. Blaze plan + Trigger Email extension + SMTP/SendGrid
2. Deploy `firestore.rules` and `requestOtp` / `verifyOtp`
3. Pass `comments` + `firebaseConfig` into `DevInspector`

Default allowlist is `@birdeye.com` (override with `commentsAllowedEmailDomain`). In Comment mode, **Shift+C** hides pins and the comments drawer (session stays signed in).

## Markdown export

```ts
import { formatAnnotationsMarkdown } from "@balajik-cmyk/dev-inspector";

const markdown = formatAnnotationsMarkdown(annotations);
```

## Development

```bash
npm install
npm test
npm run build
```

### Playground

Interactive sample app for manual testing (CSS inspect, spacing, annotations):

```bash
npm run playground
```

Opens at [http://localhost:5175](http://localhost:5175). Source lives in `playground/` and aliases the local package from `src/`.

## License

MIT
