import type { Metadata } from "next";
import { getVeritonePilotBrief } from "../brief";
import PilotNavigation from "../PilotNavigation";
import styles from "../../partnerships.module.css";

export const metadata: Metadata = { title: "Veritone Pilot Workflow | BLTZ Admin" };

const handoffs = [
  {
    title: "Discover",
    owner: "Veritone → BLTZ",
    details: "Use approved archive search or API access to check coverage and source candidate clips. Veritone shares source IDs, event metadata, credits, and preview references where permitted.",
  },
  {
    title: "Match",
    owner: "BLTZ",
    details: "Verify the athlete, game, and play. Attach the candidate source ID to the athlete’s Career ID and Moment. Flag uncertain matches for review.",
  },
  {
    title: "Clear",
    owner: "Veritone + BLTZ",
    details: "Veritone confirms licensing authority and allowed uses with the rights holder where required. BLTZ confirms athlete permission and institution participation where applicable. Record the agreed audience, format, credit, and expiry.",
  },
  {
    title: "Activate",
    owner: "BLTZ → Veritone",
    details: "Show the approved reference or media in the athlete Locker with source credit. Send licensing interest to Veritone with the source clip ID and intended use. Veritone handles quotes, licensing, and delivery.",
  },
  {
    title: "Measure",
    owner: "Veritone + BLTZ",
    details: "Review Locker engagement, licensing referrals, and outcomes both teams can attribute to the pilot. Compare results with kickoff targets and decide on the next cohort.",
  },
];

const milestones = [
  { title: "Scope and permissions", details: "Confirm archive and API access, open institution outreach, and agree on pilot owners and permissions." },
  { title: "Technical proof", details: "Test search, athlete and Moment matching, and how the Locker handles each rights state." },
  { title: "Live cohort", details: "Activate the agreed media in participating athlete Lockers as approvals come through." },
  { title: "Review and expansion decision", details: "Review results together and decide whether to expand to a new cohort." },
];

export default async function VeritoneWorkflowPage() {
  const brief = await getVeritonePilotBrief();

  return (
    <div className={styles.workspace}>
      <PilotNavigation current="workflow" />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Veritone × BLTZ / Proposed pilot</p>
        <h1>Pilot media workflow</h1>
        <p className={styles.lede}>From archive discovery to an authorized Locker experience and a measurable licensing referral.</p>
      </header>
      <section aria-labelledby="pilot-handoff">
        <h2 id="pilot-handoff" className={styles.sectionTitle}>Media handoff</h2>
        <ol className={styles.timeline}>
          {handoffs.map((step, index) => (
            <li key={step.title}>
              <div className={styles.phase}>
                <p className={styles.eyebrow}>Step {index + 1}</p>
                <p>{step.owner}</p>
              </div>
              <div>
                <h3>{step.title}</h3>
                <p className={styles.copy}>{step.details}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="pilot-timeline">
        <h2 id="pilot-timeline" className={styles.sectionTitle}>Proposed pilot timeline</h2>
        <ol className={styles.timeline}>
          {milestones.map((phase, index) => (
            <li key={phase.title}>
              <div className={styles.phase}>
                <p className={styles.eyebrow}>{brief?.timeline[index] ?? `Phase ${index + 1}`}</p>
              </div>
              <div>
                <h3>{phase.title}</h3>
                <p className={styles.copy}>{phase.details}</p>
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
        <p>Keep clips with missing, declined, or expired permission out of the demo. Confirm Veritone access and rights, athlete permission, and institution participation for a school-led cohort. If the preferred cohort is unavailable, consider other willing schools, NIL groups, or licensed archives.</p>
      </section>
      <p className={styles.source}>Licensing reference <a href="https://www.veritone.com/services/licensing-services/" target="_blank" rel="noreferrer">Veritone Footage Licensing Services (opens in a new tab)</a></p>
    </div>
  );
}
