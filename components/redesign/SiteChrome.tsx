"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import styles from "./redesign.module.css";

type Audience = "athletes" | "enterprise";

type Routes = { athletes: string; enterprise: string; legal: boolean };

/** Full mockups, still in design. */
export const MOCKUP_ROUTES: Routes = { athletes: "/redesign", enterprise: "/redesign/enterprise", legal: true };
/** Live pages (hero sections only, for now). /terms doesn't exist yet, so the footer hides the legal column. */
export const LIVE_ROUTES: Routes = { athletes: "/", enterprise: "/enterprise", legal: false };

const RoutesContext = createContext<Routes>(MOCKUP_ROUTES);

/** Wrap a live page so its nav and footer link to the live routes. */
export function LiveRoutes({ children }: { children: ReactNode }) {
  return <RoutesContext.Provider value={LIVE_ROUTES}>{children}</RoutesContext.Provider>;
}
export const useRoutes = () => useContext(RoutesContext);

export function SiteNav({ audience, announcement }: { audience: Audience; announcement?: ReactNode }) {
  const ROUTES = useRoutes();
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.nav} ${solid ? styles.navSolid : ""}`}>
      {announcement ? <div className={styles.announce}>{announcement}</div> : null}
      <div className={styles.navInner}>
        <Link className={styles.brand} href={ROUTES[audience]} aria-label="BLTZ home">
          <Image src="/images/bltz-mark.svg" alt="" width={34} height={34} priority style={{ height: "auto" }} />
          <span aria-hidden="true">BLTZ</span>
        </Link>
        <nav className={styles.audienceSwitch} aria-label="Choose your view">
          <Link href={ROUTES.athletes} aria-current={audience === "athletes" ? "page" : undefined}>
            Athletes
          </Link>
          <Link href={ROUTES.enterprise} aria-current={audience === "enterprise" ? "page" : undefined}>
            Enterprise
          </Link>
        </nav>
        <div className={styles.navRight}>
          {audience === "enterprise" ? (
            <Link className={styles.navSignIn} href="/auth/login">Sign in</Link>
          ) : null}
          <a className={`${styles.button} ${styles.navCta}`} href={audience === "athletes" ? "#claim" : "#demo"}>
            {audience === "athletes" ? "Claim my locker" : "Book a demo"}
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const ROUTES = useRoutes();
  return (
    <footer className={styles.footer}>
      <div className={`${styles.inner} ${styles.footerGrid}`}>
        <div>
          <Link className={styles.brand} href={ROUTES.athletes}>
            <Image src="/images/bltz-mark.svg" alt="" width={30} height={30} />
            <span>BLTZ</span>
          </Link>
          <p className={styles.muted} style={{ maxWidth: "26em", marginTop: 16 }}>
            Player Lockers for athletes, and the programs and collectives behind them.
          </p>
        </div>
        <div>
          <h2>Product</h2>
          <ul>
            <li><Link href={ROUTES.athletes}>For athletes</Link></li>
            <li><Link href={ROUTES.enterprise}>For programs and collectives</Link></li>
          </ul>
        </div>
        <div>
          <h2>Get started</h2>
          <ul>
            <li><Link href={`${ROUTES.athletes}#claim`}>Claim a locker</Link></li>
            <li><Link href={`${ROUTES.enterprise}#demo`}>Book a demo</Link></li>
            <li><Link href="/auth/login">Sign in</Link></li>
          </ul>
        </div>
        {/* TODO: /terms doesn't exist yet, so this column stays hidden on the live pages. */}
        {ROUTES.legal ? (
          <div>
            <h2>Legal</h2>
            <ul>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of use</Link></li>
            </ul>
          </div>
        ) : null}
      </div>
      <div className={`${styles.inner} ${styles.footerBase}`}>
        <span>© {new Date().getFullYear()} BLTZ. All rights reserved.</span>
        <Link href="/privacy">Privacy policy</Link>
      </div>
    </footer>
  );
}

/** Slim closing bar for the live pages: privacy link and copyright. */
export function LegalBar() {
  return (
    <footer className={styles.legalBar}>
      <span>© {new Date().getFullYear()} BLTZ. All rights reserved.</span>
      <Link href="/privacy">Privacy policy</Link>
    </footer>
  );
}

export function Faq({ title, items }: { title: ReactNode; items: { q: string; a: ReactNode }[] }) {
  return (
    <section className={styles.section} aria-labelledby="faq-title">
      <div className={`${styles.inner} ${styles.faq}`}>
        <h2 className={styles.h2} id="faq-title">{title}</h2>
        <div className={styles.faqList}>
          {items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Reads the self-hosted display font's family name for use in canvas textures. */
const noopSubscribe = () => () => {};
const readDisplayFont = () =>
  getComputedStyle(document.querySelector("[data-redesign]") ?? document.body)
    .getPropertyValue("--rd-font-display")
    .trim() || "Arial Narrow, sans-serif";

export function useDisplayFontFamily() {
  return useSyncExternalStore(noopSubscribe, readDisplayFont, () => "");
}
