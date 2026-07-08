# @balajik-cmyk/dev-inspector

Drop-in React dev inspector — computed CSS, Figma-style spacing measurement, and Agentation-style annotations with markdown export.

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

## License

MIT
