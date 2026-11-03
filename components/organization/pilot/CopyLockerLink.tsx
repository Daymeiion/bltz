"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconLink } from "@tabler/icons-react";

/** Copies the public Locker URL so staff can paste it into a post or email. */
export function CopyLockerLink({ href, name, label = "Copy fan link" }: { href: string; name: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="pilot-pill pilot-pill--quiet pilot-copy" data-copied={copied || undefined} onClick={() => void copy()} aria-label={`${label} for ${name}`}>
      {copied ? <IconCheck stroke={1.5} aria-hidden /> : <IconLink stroke={1.5} aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
