import { DevInspector, demoFirebaseConfig } from "@balajik-cmyk/dev-inspector";

const useEmulators = import.meta.env.VITE_COMMENTS_EMULATORS === "true";
const mockOtp = import.meta.env.VITE_COMMENTS_MOCK_OTP === "true";
const projectId =
  import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "demo-dev-inspector";

const commentsEnabled = useEmulators || mockOtp;
const firebaseConfig = commentsEnabled
  ? demoFirebaseConfig(projectId)
  : undefined;

export function App() {
  return (
    <>
      <div className="page">
        <header className="hero">
          <p className="eyebrow">Playground</p>
          <h1>Dev Inspector sample</h1>
          <p className="lede">
            Open the dock (bottom-right), then use Inspect (⌥/Alt+click) for CSS
            and spacing.
            {commentsEnabled ? (
              <>
                {" "}
                Comments are on in <strong>emulator + mock OTP</strong> mode —
                use <code>you@birdeye.com</code> and code{" "}
                <code>000000</code>.
              </>
            ) : (
              <>
                {" "}
                To try Comments locally, copy <code>playground/.env.example</code>{" "}
                to <code>.env</code> and start Firebase emulators.
              </>
            )}
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary">
              Primary action
            </button>
            <button type="button" className="btn btn-ghost">
              Secondary
            </button>
          </div>
        </header>

        <section className="grid">
          <article className="card card-raised">
            <h2>Raised card</h2>
            <p>
              Use this block to check padding, border-radius, and box-shadow in
              the CSS panel.
            </p>
            <div className="chip-row">
              <span className="chip">Layout</span>
              <span className="chip chip-accent">Typography</span>
              <span className="chip">Effects</span>
            </div>
          </article>

          <article className="card card-outline">
            <h2>Outline card</h2>
            <p>
              Hover neighbors while inspecting to see Figma-style spacing bands
              between elements.
            </p>
            <label className="field">
              <span>Email</span>
              <input type="email" placeholder="you@example.com" />
            </label>
          </article>

          <article className="card card-dense">
            <h2>Dense stack</h2>
            <ul className="stack">
              <li>First row · 12px gap</li>
              <li>Second row · measure me</li>
              <li>Third row · tight spacing</li>
            </ul>
          </article>
        </section>

        <section className="banner">
          <div>
            <h2>Wide banner</h2>
            <p>Good target for width/height labels and distance guides.</p>
          </div>
          <button type="button" className="btn btn-dark">
            Annotate this
          </button>
        </section>

        <footer className="footer">
          <span>@balajik-cmyk/dev-inspector</span>
          <a href="https://github.com/balajik-cmyk/dev-inspector">GitHub</a>
        </footer>
      </div>

      <DevInspector
        captureMode="alt-click"
        theme="auto"
        comments={commentsEnabled}
        firebaseConfig={firebaseConfig}
        commentsUseEmulators={useEmulators}
        commentsMockOtp={mockOtp}
      />
    </>
  );
}
