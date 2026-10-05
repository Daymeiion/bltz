"use client";

import PreviewClaimButton from "./PreviewClaimButton";
import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./preview-room-nav.module.css";

export default function PreviewRoomNav({ lockerHref, onSearch, athleteName, headshotUrl, navigation }: { lockerHref: string; onSearch: () => void; athleteName: string; headshotUrl: string; navigation?: ReactNode }) {
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
      <PreviewClaimButton />
    </div>;
  return <><header className={navigation ? styles.withNavigation : undefined} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px", position: "relative", zIndex: 6 }}>
    <Link href={lockerHref} aria-label="BLTZ Player Locker">
      <img src="/images/preview-nav-logo.png" alt="BLTZ" style={{ height: 30, width: "auto", display: "block" }} />
    </Link>
    {navigation}
    {actions}
  </header>
  {scrolled && <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, background: "rgba(11,14,26,.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid #1E2640" }}>
    <div className={navigation ? styles.withNavigation : undefined} style={{ maxWidth: 1180, marginInline: "auto", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Link href={lockerHref} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: "white", textDecoration: "none" }}>
        <img src={headshotUrl} alt="" style={{ width: 36, height: 36, borderRadius: 9999, objectFit: "cover", objectPosition: "top", flexShrink: 0, border: "1px solid #1E2640" }} />
        <span style={{ fontWeight: 800, fontSize: 16, lineHeight: 1, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{athleteName}</span>
      </Link>
      {navigation}
      {actions}
    </div>
  </header>}</>;
}
