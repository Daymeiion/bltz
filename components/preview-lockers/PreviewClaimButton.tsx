"use client";

// Open the same claim dialog as the footer without duplicating its form or events.
export default function PreviewClaimButton() {
  return <button type="button" aria-haspopup="dialog" onClick={() => document.getElementById("preview-locker-claim-trigger")?.click()} style={{ padding: "8px 15px", borderRadius: 9999, border: "none", background: "linear-gradient(135deg,#FFB940,#F5A623,#C77D00)", color: "#0A0800", fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10, letterSpacing: ".1em", cursor: "pointer" }}>CLAIM</button>;
}
