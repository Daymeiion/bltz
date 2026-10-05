"use client";

import { useEffect, useRef } from "react";

export function FittedHeroName({ name, fontFamily }: { name: string; fontFamily: string }) {
  const box = useRef<HTMLHeadingElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const heading = box.current, label = text.current;
    if (!heading || !label) return;
    let disposed = false;
    const fit = () => {
      if (disposed || heading.clientWidth <= 0) return;
      label.style.setProperty("--fit-scale", "1");
      const available = Math.max(1, heading.clientWidth - 4);
      let scale = 1;
      for (let pass = 0; pass < 8; pass++) {
        const width = label.scrollWidth;
        if (width <= available) break;
        scale *= available / width;
        label.style.setProperty("--fit-scale", String(scale));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(heading);
    window.addEventListener("resize", fit);
    document.fonts?.addEventListener("loadingdone", fit);
    void document.fonts?.ready.then(fit);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", fit);
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, [name, fontFamily]);
  return <h1 ref={box} className="locker-hero-name" style={{ width: "100%", minWidth: 0, fontFamily, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-.005em", textTransform: "uppercase", color: "#fff", margin: 0, paddingTop: 5, paddingBottom: 3, whiteSpace: "nowrap" }}>
    <span ref={text} style={{ display: "inline-block", fontSize: "calc(var(--hero-name-size, 36px) * var(--fit-scale, 1))" }}>{name}</span>
  </h1>;
}
