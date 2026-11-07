"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { OrganizationShell } from "@/components/organization/OrganizationShell";
import { AthleteIntelligence } from "@/components/organization/pilot/AthleteIntelligence";
import { LaunchLocker } from "@/components/organization/pilot/LaunchLocker";
import { ThisWeek } from "@/components/organization/pilot/ThisWeek";
import {
  previewActivations,
  previewAthleteFile,
  previewContext,
  previewLaunches,
  previewMedia,
  previewOptions,
  previewOrganizations,
  previewReach,
  previewRoster,
  previewTheme,
} from "@/components/organization/pilot/preview-data";
import styles from "./crm.module.css";

export type CrmView = "overview" | "intelligence" | "launch";

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 780 };

function Screen({ view }: { view: CrmView }) {
  const shell = (children: React.ReactNode) => (
    <OrganizationShell context={previewContext} organizations={previewOrganizations} options={previewOptions} previewTheme={previewTheme}>
      {children}
    </OrganizationShell>
  );
  if (view === "intelligence") {
    const file = previewAthleteFile("p1");
    if (!file) return null;
    return shell(
      <AthleteIntelligence
        organizationId={previewContext.organization.id}
        schoolName={previewContext.organization.name}
        file={file}
        initialActivations={previewActivations.filter((row) => row.playerId === "p1")}
        initialReach={previewReach.p1 ?? []}
        initialMedia={previewMedia.p1 ?? []}
        canManage
        roster={previewRoster.players}
        contactEmail="marcus@halefitness.example"
        profileBaseHref="/organization/preview/intelligence"
        preview
      />,
    );
  }
  if (view === "launch") {
    return shell(
      <LaunchLocker
        organizationId={previewContext.organization.id}
        schoolName={previewContext.organization.name}
        players={previewRoster.players}
        initialLaunches={previewLaunches}
        canManage
        preview
      />,
    );
  }
  return shell(
    <ThisWeek
      schoolName={previewContext.organization.name}
      roster={previewRoster}
      activity={{ state: "ready", activations: previewActivations }}
      intelligenceHref="/organization/preview/intelligence"
      preview
    />,
  );
}

/**
 * The real BLTZ organization CRM, rendered with its built-in preview data and
 * scaled to fit. It is display-only: clicks and focus are blocked so the
 * landing page never navigates into the workspace.
 */
export function CrmScreen({
  view,
  offsetY = 0,
  className,
  label,
}: {
  view: CrmView;
  /** Scrolls the CRM content up by this many design pixels, to frame a section. */
  offsetY?: number;
  className?: string;
  label?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState(DESKTOP);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "400px" });
    io.observe(host);
    const ro = new ResizeObserver(() => {
      const design = window.innerWidth < 768 ? PHONE : DESKTOP;
      setSize(design);
      setScale(host.clientWidth / design.width);
    });
    ro.observe(host);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`${styles.frame} ${className ?? ""}`}
      style={{ aspectRatio: `${size.width} / ${size.height}` } as CSSProperties}
      role="img"
      aria-label={label ?? "The BLTZ organization workspace"}
    >
      <div
        className={styles.canvas}
        inert
        style={{
          width: size.width,
          height: size.height,
          transform: `scale(${scale})`,
          "--crm-h": `${size.height}px`,
          "--crm-offset": `${-offsetY}px`,
        } as CSSProperties}
        onClickCapture={(e) => e.preventDefault()}
      >
        {visible ? <Screen view={view} /> : null}
      </div>
    </div>
  );
}
