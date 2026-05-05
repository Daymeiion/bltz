import type { ReactNode } from "react";

// Bare layout that overrides the parent /onboarding chrome — the preview is
// rendered inside an iframe and shouldn't inherit the wrapping max-width or
// gradient padding.
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-black">{children}</div>;
}
