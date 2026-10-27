import {
  Database, UserRound, Megaphone, ChartNoAxesCombined, FileCheck2,
  Newspaper, Mic2, Printer, Presentation, Images, SlidersHorizontal, UsersRound,
  type LucideIcon,
} from "lucide-react";
import content from "./meeting-content.json";

const icons: Record<string, LucideIcon> = {
  Database, UserRound, Megaphone, ChartNoAxesCombined, FileCheck2,
  Newspaper, Mic2, Printer, Presentation, Images, SlidersHorizontal, UsersRound,
};
const gold = "#ffbb00";
const ink = "#090b10";

export function DiagramIcon({ name, size = 40, x, y, color = gold }: {
  name: string; size?: number; x?: number; y?: number; color?: string;
}) {
  const Icon = icons[name];
  return <Icon x={x} y={y} width={size} height={size} stroke={color} color={color} strokeWidth={1.7} aria-hidden="true" />;
}

function Label({ lines, x, y, size = 28, color = "#ffffff", weight = "bold" }: {
  lines: string[]; x: number; y: number; size?: number; color?: string; weight?: string | number;
}) {
  return <text x={x} y={y} textAnchor="middle" fill={color} fontSize={size} fontWeight={weight}>
    {lines.map((line, index) => <tspan key={line} x={x} dy={index ? size * 1.18 : 0}>{line}</tspan>)}
  </text>;
}

/** Pure SVG: shared by the browser's desktop view and both PDF exports. */
export function MeetingDiagram({ view }: { view: "pilot" | "workflow" }) {
  const pilot = view === "pilot";
  const title = pilot ? content.pilotTitle : content.workflowTitle;
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 790" width="1280" height="790"
    role="img" aria-labelledby={`${view}-diagram-title ${view}-diagram-description`} fontFamily="Arial">
    <title id={`${view}-diagram-title`}>{title}</title>
    <desc id={`${view}-diagram-description`}>{content.description}</desc>
    <rect width="1280" height="790" fill={ink} />
    <text x="32" y="33" fill={gold} fontSize="18" fontWeight="bold" letterSpacing="1.6">{content.brand} / {content.proposed}</text>
    <text x="32" y="94" fill="#ffffff" fontSize="46" fontWeight="bold">{title}</text>

    {content.stages.map((stage, index) => {
      const x = 32 + index * 250;
      const source = stage.id === "getty";
      const color = source ? "#111722" : gold;
      return <g key={stage.id}>
        <rect x={x} y="140" width="216" height="226" rx="18" fill={source ? "#ffffff" : "#171d27"} stroke={source ? "#ffffff" : "#36404e"} />
        {pilot && stage.id === "locker"
          ? <text x={x + 108} y="228" fill={gold} fontSize="76" fontWeight="bold" textAnchor="middle">50</text>
          : <DiagramIcon name={stage.icon} size={66} x={x + 75} y={166} color={color} />}
        <Label lines={stage.lines} x={x + 108} y={276} color={source ? "#111722" : "#ffffff"} />
        {stage.caption && <Label lines={stage.id === "interest" ? ["Tinybird + QStash", "events"] : [stage.caption]} x={x + 108} y={stage.id === "interest" ? 336 : 345} size={21} color="#bdc8d7" weight={400} />}
        {index < content.stages.length - 1 && <path d={`M ${x + 224} 250 H ${x + 240} m -6 -7 7 7 -7 7`} fill="none" stroke={gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      </g>;
    })}

    <path d="M 1140 366 V 389 H 640 V 405 m -7 -7 7 7 7 -7" fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="32" y="410" width="1216" height="108" rx="16" fill="#10141c" stroke="#36404e" />
    {content.uses.map((use, index) => <g key={use.id}>
      {index > 0 && <line x1={32 + index * 304} x2={32 + index * 304} y1="436" y2="492" stroke="#36404e" />}
      <DiagramIcon name={use.icon} x={50 + index * 304} y={444} size={40} />
      <Label lines={use.lines} x={198 + index * 304} y={use.lines.length > 1 ? 454 : 472} size={24} />
    </g>)}

    {content.roles.map((role, index) => {
      const x = 32 + index * 626;
      return <g key={role.id}>
        <rect x={x} y="558" width="590" height="200" rx="18" fill="#171d27" stroke={index ? "#36404e" : "#857027"} />
        <text x={x + 26} y="602" fill="#ffffff" fontSize="30" fontWeight="bold">{role.title}</text>
        {role.items.map((item, itemIndex) => <g key={item.icon}>
          <DiagramIcon name={item.icon} x={x + 73 + itemIndex * 192} y={629} size={42} />
          <Label lines={item.lines} x={x + 94 + itemIndex * 192} y={709} size={24} />
        </g>)}
      </g>;
    })}
  </svg>;
}
