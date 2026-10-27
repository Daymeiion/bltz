import { Download } from "lucide-react";
import content from "./meeting-content.json";
import { MeetingDiagram, DiagramIcon } from "./MeetingDiagram";
import styles from "./meeting.module.css";

function PilotDocument({ view }: { view: "pilot" | "workflow" }) {
  const pilot = view === "pilot";
  const title = pilot ? content.pilotTitle : content.workflowTitle;
  const document = pilot ? "one-sheet" : "workflow";
  return <div className={styles.canvas}><article className={styles.presentation} aria-label={pilot ? "Getty pilot visual one-sheet" : "Getty image use and revenue workflow"}>
    <header className={styles.documentHeader}>
      <div className={styles.mobileHeader}><p>{content.brand} / {content.proposed}</p><h1>{title}</h1></div>
      <a className={styles.download} href={`/admin/getty-partnership/download?document=${document}`} download={`BLTZ-getty-${pilot ? "one-sheet" : "image-workflow"}.pdf`}><Download size={18} aria-hidden="true" /> Download PDF</a>
    </header>
    <div className={styles.desktopDiagram}><MeetingDiagram view={view} /></div>
    <div className={styles.mobileDiagram}>
      <ol className={styles.mobileStages} aria-label="Image licensing workflow">
        {content.stages.map(stage => <li key={stage.id} className={stage.id === "getty" ? styles.sourceStage : styles.mobileStage}>
          {pilot && stage.id === "locker" ? <span className={styles.cohort}>50</span> : <DiagramIcon name={stage.icon} size={56} />}
          <h2>{stage.lines.join(" ")}</h2>{stage.caption && <p>{stage.caption}</p>}
        </li>)}
      </ol>
      <ul className={styles.mobileUses} aria-label="Agreed license use cases">{content.uses.map(use => <li key={use.id}><DiagramIcon name={use.icon} size={32} /><span>{use.lines.join(" · ")}</span></li>)}</ul>
      <div className={styles.mobileRoles}>{content.roles.map(role => <section key={role.id} aria-labelledby={`${view}-${role.id}-role`}><h2 id={`${view}-${role.id}-role`}>{role.title}</h2><ul>{role.items.map(item => <li key={item.icon}><DiagramIcon name={item.icon} size={36} /><span>{item.lines.join(" ")}</span></li>)}</ul></section>)}</div>
    </div>
  </article></div>;
}

export function OneSheet() { return <PilotDocument view="pilot" />; }
export function ImageWorkflow() { return <PilotDocument view="workflow" />; }
