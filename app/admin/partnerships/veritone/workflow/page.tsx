import type { Metadata } from "next";
import PilotNavigation from "../PilotNavigation";
import styles from "../../partnerships.module.css";

export const metadata: Metadata = { title: "Veritone Pilot Workflow | BLTZ Admin" };

const phases = [
  {
    weeks: "Week 1",
    owner: "Veritone + BLTZ",
    title: "Agree on the pilot scope",
    details: "BLTZ proposes athletes and Moments. Veritone confirms the eligible collection. Both teams agree on pilot viewers, allowed surfaces, success measures, and the format for sharing clip metadata.",
    output: "Scope, owners, and a shared clip register",
  },
  {
    weeks: "Week 2",
    owner: "Veritone → BLTZ",
    title: "Source and match clips",
    details: "Veritone shares candidate clip IDs, source links, credits, event metadata, and preview references where allowed. BLTZ verifies the athlete and game, then maps each match to a Career ID and Moment.",
    output: "Matched shortlist with uncertain matches flagged",
  },
  {
    weeks: "Weeks 3–4",
    owner: "Veritone + BLTZ",
    title: "Clear and stage each clip",
    details: "Veritone confirms permitted use with the rights holder where required, including audience, format, credit, and expiry. BLTZ logs the approval and stages only approved items in a private Locker demo.",
    output: "Rights-reviewed demo and licensing handoff links",
  },
  {
    weeks: "Week 5",
    owner: "BLTZ → Veritone",
    title: "Test the licensing handoff",
    details: "Reviewers open a clip from an athlete Moment and follow the agreed link or contact. BLTZ tests that Veritone receives the source clip ID and intended use. Veritone handles any quote, licensing, and delivery for real requests.",
    output: "Handoff test results and issues to resolve",
  },
  {
    weeks: "Week 6",
    owner: "Veritone + BLTZ",
    title: "Review and decide",
    details: "Compare results against kickoff targets. Review unmatched clips, approval delays, and handoff friction. Agree on whether to expand, revise, or close the pilot, and remove or disable references when their permission ends.",
    output: "Shared readout and next decision",
  },
];

export default function VeritoneWorkflowPage() {
  return (
    <div className={styles.workspace}>
      <PilotNavigation current="workflow" />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Veritone × BLTZ / Proposed pilot</p>
        <h1>Pilot media workflow</h1>
        <p className={styles.lede}>Six weeks from an agreed kickoff. Each phase has an owner and a deliverable. Clips advance when their match and permitted use are confirmed.</p>
      </header>
      <section aria-labelledby="pilot-timeline">
        <h2 id="pilot-timeline" className={styles.sectionTitle}>Pilot timeline</h2>
        <ol className={styles.timeline}>
          {phases.map((phase) => (
            <li key={phase.weeks}>
              <div className={styles.phase}>
                <p className={styles.eyebrow}>{phase.weeks}</p>
                <p>{phase.owner}</p>
              </div>
              <div>
                <h3>{phase.title}</h3>
                <p className={styles.copy}>{phase.details}</p>
                <p className={styles.output}>{phase.output}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className={styles.roles}>
        <section>
          <h2>What travels with each clip</h2>
          <p>Source ID and link, athlete and Moment, event date, required credit, permitted format and audience, approval reference, expiry if applicable, and the Veritone handoff destination.</p>
        </section>
        <section>
          <h2>What we measure</h2>
          <p>Verified matches and cleared clips out of candidates, time from shortlist to clearance decision, complete licensing handoffs out of test attempts, and reviewer feedback. Agree on numerical targets at kickoff.</p>
        </section>
      </div>
      <section className={styles.callout}>
        <h2>Approval before display</h2>
        <p>Keep clips with missing, declined, or expired permission out of the demo. Use a source link, approved embed, or licensed file according to the recorded permission. Any public rollout requires separate approval.</p>
      </section>
      <p className={styles.source}>Licensing reference <a href="https://www.veritone.com/services/licensing-services/" target="_blank" rel="noreferrer">Veritone Footage Licensing Services (opens in a new tab)</a></p>
    </div>
  );
}
