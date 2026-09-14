"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export default function PreviewRoomNav({ lockerHref, onSearch, athleteName, headshotUrl }: { lockerHref: string; onSearch: () => void; athleteName: string; headshotUrl: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 320);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const actions = <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
      <button type="button" aria-label="Search BLTZ" onClick={onSearch} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}>
        <Search size={22} color="#FFB940" strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button type="button" aria-haspopup="dialog" onClick={() => document.getElementById("preview-locker-claim-trigger")?.click()} style={{ padding: "8px 15px", borderRadius: 9999, border: "none", background: "linear-gradient(135deg,#FFB940,#F5A623,#C77D00)", color: "#0A0800", fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 10, letterSpacing: ".1em", cursor: "pointer" }}>CLAIM</button>
    </div>;
  return <><header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px", position: "relative", zIndex: 6 }}>
    <Link href={lockerHref} aria-label="BLTZ Player Locker">
      <img src="/images/preview-nav-logo.png" alt="BLTZ" style={{ height: 30, width: "auto", display: "block" }} />
    </Link>
    {actions}
  </header>
  {scrolled && <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, background: "rgba(11,14,26,.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid #1E2640" }}>
    <div style={{ maxWidth: 1180, marginInline: "auto", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Link href={lockerHref} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: "white", textDecoration: "none" }}>
        <img src={headshotUrl} alt="" style={{ width: 36, height: 36, borderRadius: 9999, objectFit: "cover", objectPosition: "top", flexShrink: 0, border: "1px solid #1E2640" }} />
        <span style={{ fontWeight: 800, fontSize: 16, lineHeight: 1, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{athleteName}</span>
      </Link>
      {actions}
    </div>
  </header>}</>;
}
