"use client";

import * as React from "react";

interface Props {
  /** Reserved for future deep-linking. Currently unused — preview is draft-only. */
  slug?: string;
  /** Draft we want the iframe to render. */
  draft: unknown;
}

/**
 * Live preview using postMessage rather than reload — the iframe loads once,
 * then we push the draft on every change. Keeps the preview snappy and avoids
 * burning a network round-trip per keystroke.
 */
export function LivePreviewIframe({ draft }: Props) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "bltz:preview:ready") setReady(true);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  React.useEffect(() => {
    if (!ready || !ref.current?.contentWindow) return;
    ref.current.contentWindow.postMessage(
      { type: "bltz:preview:draft", draft },
      "*",
    );
  }, [draft, ready]);

  return (
    <iframe
      ref={ref}
      src="/onboarding/preview"
      title="Live locker preview"
      // No border or rounded corners — the preview should read as the
      // bare locker page, not a windowed sub-view of the onboarding
      // flow. Just a flush iframe with the page's own black bg.
      className="block h-[60vh] w-full bg-black"
    />
  );
}
