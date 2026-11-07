"use client";

import Image from "next/image";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useRef } from "react";
import ui from "./enterprise.module.css";

// Product UI mockups built in HTML so they stay sharp and can animate.
// All names and numbers are sample data for a fictional program.

const roster = [
  { name: "Jordan Carter", sport: "Football", cls: "SR", status: "live", views: "4,812", photo: "/images/Headshot.png" },
  { name: "Maya Brooks", sport: "Basketball", cls: "JR", status: "review", views: "2,903" },
  { name: "Andre Okafor", sport: "Football", cls: "SO", status: "live", views: "1,977", photo: "/images/dante-hughes/13-chargers-profile.png" },
  { name: "Lena Salazar", sport: "Volleyball", cls: "SR", status: "live", views: "1,540" },
  { name: "Chris Mason", sport: "Baseball", cls: "FR", status: "invited", views: "—" },
];

const statusLabel: Record<string, string> = { live: "Live", review: "Needs approval", invited: "Invited" };

function Avatar({ name, photo }: { name: string; photo?: string }) {
  return (
    <span className={ui.avatar}>
      {photo ? <Image src={photo} alt="" fill sizes="28px" /> : name.split(" ").map((p) => p[0]).join("")}
    </span>
  );
}

function ReachChart() {
  // A gently rising weekly reach curve.
  const pts = [18, 22, 21, 30, 34, 31, 42, 47, 45, 58, 63, 71];
  const w = 520;
  const h = 120;
  const step = w / (pts.length - 1);
  const y = (v: number) => h - 10 - (v / 80) * (h - 20);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className={ui.chart} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="rd-chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3a63ff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3a63ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className={ui.chartArea} d={`${d} L${w} ${h} L0 ${h} Z`} />
      <path className={ui.chartLine} d={d} pathLength={1} />
    </svg>
  );
}

/** The hero product shot. It starts tilted back and flattens as it scrolls in. */
export function DashboardShot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight * 0.9)));
      el.style.setProperty("--tilt", (1 - p).toFixed(3));
      el.style.setProperty("--chart", Math.min(1, Math.max(0, (p - 0.35) / 0.6)).toFixed(3));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
    };
  }, []);

  return (
    <div className={`${ui.ui} ${ui.shotWrap}`} ref={ref} aria-label="Sample BLTZ program dashboard" role="img">
      <div className={ui.shot}>
        <aside className={ui.side} aria-hidden="true">
          <div className={ui.sideBrand}>
            <Image src="/images/bltz-mark.svg" alt="" width={22} height={22} /> Westbrook
          </div>
          {[
            [LayoutDashboard, "Dashboard", true],
            [Users, "Roster", false],
            [Rocket, "Launch", false],
            [ShieldCheck, "Approvals", false],
            [CalendarDays, "Activations", false],
            [Sparkles, "Intelligence", false],
            [BarChart3, "Analytics", false],
          ].map(([Icon, label, active]) => {
            const I = Icon as typeof Users;
            return (
              <span className={ui.sideItem} data-active={active as boolean} key={label as string}>
                <I size={16} /> {label as string}
              </span>
            );
          })}
        </aside>
        <div className={ui.main} aria-hidden="true">
          <div className={ui.topbar}>
            <h4>Westbrook Athletics</h4>
            <span className={ui.pill}>Last <span className={ui.num}>30</span> days</span>
          </div>
          <div className={ui.kpis}>
            {[
              ["Lockers live", "84", "+12"],
              ["Waiting on approval", "6", "−3"],
              ["Locker views", "12,480", "+18%"],
              ["Shares", "1,906", "+9%"],
            ].map(([label, value, delta]) => (
              <div className={ui.kpi} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <em>{delta}</em>
              </div>
            ))}
          </div>
          <div className={ui.grid2}>
            <div className={ui.card}>
              <div className={ui.cardHead}>
                Roster <span className={ui.pill}><span className={ui.num}>5</span>&nbsp;of&nbsp;<span className={ui.num}>96</span></span>
              </div>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Athlete</th>
                    <th className={ui.hideSm}>Sport</th>
                    <th className={ui.hideSm}>Class</th>
                    <th>Status</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r) => (
                    <tr key={r.name}>
                      <td><span className={ui.who}><Avatar name={r.name} photo={r.photo} />{r.name}</span></td>
                      <td className={ui.hideSm}>{r.sport}</td>
                      <td className={ui.hideSm}>{r.cls}</td>
                      <td><span className={`${ui.status} ${ui[r.status]}`}>{statusLabel[r.status]}</span></td>
                      <td className={ui.num}>{r.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={ui.card} style={{ display: "grid", gap: 14, alignContent: "start" }}>
              <div className={ui.cardHead} style={{ marginBottom: 0 }}>Weekly reach</div>
              <ReachChart />
              <div className={ui.bars}>
                {[["Football", "62%"], ["Basketball", "21%"], ["Volleyball", "11%"]].map(([s, w]) => (
                  <div className={ui.bar} key={s} style={{ "--w": w } as React.CSSProperties}>
                    <span>{s}</span>
                    <span className={ui.num}>{w}</span>
                    <i />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Launch: lockers being created from a roster import. */
export function LaunchPanel() {
  const teams = [
    ["Football", "96 athletes", "100%"],
    ["Women's basketball", "15 athletes", "100%"],
    ["Volleyball", "18 athletes", "72%"],
    ["Baseball", "35 athletes", "40%"],
  ];
  return (
    <div className={`${ui.ui} ${ui.panel}`} aria-hidden="true">
      <div className={ui.cardHead}>Launching lockers <span className={ui.pill}>roster.csv</span></div>
      {teams.map(([team, count, pct], i) => (
        <div className={ui.row} key={team} style={{ "--i": i } as React.CSSProperties}>
          <div>
            <strong>{team}</strong>
            <small><span className={ui.num}>{count.split(" ")[0]}</span> {count.split(" ")[1]}</small>
            <span className={ui.progress} style={{ "--w": pct } as React.CSSProperties} />
          </div>
          <span className={ui.num}>{pct}</span>
        </div>
      ))}
    </div>
  );
}

/** Approve: a review queue with usage-rights checks. */
export function ApprovePanel() {
  const items = [
    ["/images/media-6.jpg", "Game photo", "Jordan Carter", true],
    ["/images/dante-hughes/01-lott-trophy.jpg", "Award ceremony", "Andre Okafor", true],
    ["/images/dante-hughes/video-poster-02.jpg", "Broadcast clip", "Maya Brooks", false],
  ] as const;
  return (
    <div className={`${ui.ui} ${ui.panel}`} aria-hidden="true">
      <div className={ui.cardHead}>Waiting on approval <span className={ui.pill}><span className={ui.num}>6</span>&nbsp;items</span></div>
      {items.map(([src, title, who, cleared], i) => (
        <div className={ui.row} key={title} style={{ "--i": i } as React.CSSProperties}>
          <span className={ui.thumb}><Image src={src} alt="" fill sizes="64px" /></span>
          <div>
            <strong>{title}</strong>
            <small>{who}</small>
          </div>
          <span className={`${ui.chip} ${cleared ? "" : ui.chipGold}`}>{cleared ? "Rights cleared" : "Checking rights"}</span>
          <span className={ui.actions}><span>Approve</span><span>Decline</span></span>
        </div>
      ))}
    </div>
  );
}

/** Activate: planning a partner activation with athletes. */
export function ActivatePanel() {
  return (
    <div className={`${ui.ui} ${ui.panel}`} aria-hidden="true">
      <div className={ui.cardHead}>Plan an activation <span className={ui.pill}>Draft</span></div>
      <div className={ui.row} style={{ "--i": 0 } as React.CSSProperties}>
        <div>
          <small>Partner</small>
          <strong>Local credit union, back-to-school drive</strong>
        </div>
        <span className={ui.pill}>Aug <span className={ui.num}>24</span></span>
      </div>
      <div className={ui.row} style={{ "--i": 1 } as React.CSSProperties}>
        <div>
          <small>Athletes</small>
          <span className={ui.who}>
            <Avatar name="Jordan Carter" photo="/images/Headshot.png" />
            <Avatar name="Maya Brooks" />
            <Avatar name="Lena Salazar" />
            <small>+<span className={ui.num}>2</span></small>
          </span>
        </div>
        <span className={ui.chip}>All lockers live</span>
      </div>
      <div className={ui.row} style={{ "--i": 2 } as React.CSSProperties}>
        <Sparkles size={18} color="#ffc21a" />
        <div>
          <strong>Suggested: Maya Brooks</strong>
          <small>Her locker views are up <span className={ui.num}>38%</span> this month in the partner&apos;s area.</small>
        </div>
      </div>
    </div>
  );
}

/** Report: reach over time and the athletes driving it. */
export function ReportPanel() {
  return (
    <div className={`${ui.ui} ${ui.panel}`} aria-hidden="true" style={{ "--chart": 1 } as React.CSSProperties}>
      <div className={ui.cardHead}>Season report <span className={ui.pill}>This season</span></div>
      <div className={ui.kpis} style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {[["Views", "48,210"], ["Shares", "6,904"], ["New followers", "2,315"]].map(([l, v]) => (
          <div className={ui.kpi} key={l}><span>{l}</span><strong>{v}</strong></div>
        ))}
      </div>
      <div className={ui.card}><ReachChart /></div>
    </div>
  );
}
