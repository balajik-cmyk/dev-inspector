import * as React from "react";
import { computePageId, currentPageUrl } from "../../core/pageId";

/**
 * Live page URL + pageId for Comments.
 * Prefers an explicit router URL; otherwise tracks window location including
 * SPA navigations via patched history.pushState/replaceState + popstate.
 */
export function usePageUrl(explicitUrl?: string): {
  url: string;
  pageId: string | null;
} {
  const [url, setUrl] = React.useState(() => currentPageUrl(explicitUrl));

  React.useEffect(() => {
    if (explicitUrl) {
      setUrl(explicitUrl);
      return;
    }

    const sync = () => setUrl(window.location.href);
    sync();

    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);

    history.pushState = (...args: Parameters<History["pushState"]>) => {
      originalPush(...args);
      sync();
    };
    history.replaceState = (...args: Parameters<History["replaceState"]>) => {
      originalReplace(...args);
      sync();
    };

    window.addEventListener("popstate", sync);
    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      window.removeEventListener("popstate", sync);
    };
  }, [explicitUrl]);

  const pageId = React.useMemo(
    () => (url ? computePageId(url) : null),
    [url],
  );

  return { url, pageId };
}
