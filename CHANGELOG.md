# Changelog

## 0.3.0

- Add Figma-style dock with Inspect + Comment placeholder toolbar.
- Apply shared cool-slate glass chrome across panel and toolbar.
- Leaner inspect flow: no idle tooltip; properties panel opens on element pick.
- UI polish: icon-only copy, toolbar micro-animations, scrollbar gutter fix.
- Add local Vite playground for manual testing.
- Publish target set to the public npm registry.

## 0.2.0

- Fix: styles were never actually auto-injected in consuming apps (only worked when importing raw `src/` via Vite). The build now embeds the compiled CSS and injects a `<style>` tag at runtime, so the widget renders styled with zero config in any bundler.
- Change: FAB launcher icon switched from crosshair to a `</>` code-brackets icon.
- Publish: moved distribution from private GitHub Packages to the public npm registry so the team can `npm install @balajik-cmyk/dev-inspector` with no token/registry setup.

## 0.1.0

- Initial release.
