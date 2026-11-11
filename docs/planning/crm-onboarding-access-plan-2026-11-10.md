# Enterprise CRM: onboarding and shared access plan (2026-11-10)

Decisions (from the founder):
- **The athlete owns their Locker** once they claim it. Schools and agencies get access the athlete can see and switch off. BLTZ stays the operator.
- **Agency leads commercial work.** If an agency represents the athlete, it handles brand deals. A school can still feature the athlete, but a school's brief needs the agency's or athlete's OK first.
- **Organizations apply; BLTZ approves.**
- **Invites both ways:** BLTZ email on the school's behalf, or a personal signup link staff copy and send themselves.

## 1. Pilot signup
- New page `/pilot` (linked from `/enterprise`): organization type (school athletics / NIL agency), organization name, for schools the college picked from the college directory, the first admin's name, work email, role, and a password.
- Creates the account, an organization in **pending review**, and the applicant as its owner. The applicant sees "We're reviewing your application".
- **Admin → School Launches → Applications**: Approve or Decline. Approve sets the organization to approved, links the college (colors, logo), grants the applicant the pilot permissions, and builds the roster (section 2). Nothing else to run in SQL.
- Work-email check: a school applicant whose email domain matches the college's website is marked "domain verified"; others are reviewed by hand.

## 2. Roster from the master player list
- New table **organization_athletes**: one row per (organization, athlete) with the relationship (*alumni* for schools, *representation* for agencies), status, where it came from (master list, added by staff, invited) and dates.
- On approval, every player in the master list whose college matches the school is added as *alumni*: players with a Locker and players without one.
- The roster shows each player as **Live Locker**, **Preview ready** (BLTZ built one, not claimed), or **No Locker yet**.
- **Add a player** for anyone not in the master list (non-NFL, other sports): name, sport, years, email if known. It joins the roster and can be invited.

## 3. Locker invites
- For any roster player without a claimed Locker: **Invite** → send through BLTZ (email from BLTZ "on behalf of <School>") if there is an email, or **Copy signup link**.
- Each link is personal (player + organization), tracked (sent, opened, signed up), and expires. Signing up through it creates or claims the athlete's Locker through the existing onboarding, and confirms the school relationship.
- Bulk: "Invite all with an email" with a daily cap.
- BLTZ admins see every invite and its status.

## 4. Shared access: who can do what
The athlete owns the Locker. Each organization's access comes from its relationship with the athlete:

| | School (alumni) | Agency (representation) | Athlete | BLTZ |
|---|---|---|---|---|
| See career, signals, Moments | ✓ | ✓ | ✓ | ✓ |
| Plan and share activations | ✓ | ✓ | sees them | ✓ |
| Add media (goes to review) | ✓ | ✓ | ✓ approves own | clears rights |
| Edit Locker content directly | — | — | ✓ | ✓ |
| Send Locker invite (before claim) | ✓ | ✓ | — | ✓ |
| Partnership briefs to brands | asks agency/athlete when represented; else athlete approval | ✓ (athlete approval) | approves | — |
| See athlete's contact details | only if the athlete shares | only if the athlete shares | — | ✓ |
| Rights and licensing (Getty etc.) | — | — | — | ✓ |

- **Representation** starts as a request from the agency and becomes active when the athlete confirms (in their Locker, or at claim). One active representation per athlete.
- **The athlete's "Who has access" panel** (Locker dashboard): every organization with access, what it can do, and a switch to turn it off. Pending brief approvals and representation requests appear here too.
- **Before the athlete claims:** BLTZ is the caretaker. Schools and agencies can invite and plan; nothing commercial goes out without the athlete.

## Build order
- **Phase A (needed for the dry run):** signup page and approvals → roster from the master list, with Add a player → Locker invites.
- **Phase B:** organization_athletes access rules everywhere, the agency organization type and representation requests, the athlete's "Who has access" panel, brief approvals by the agency or athlete.
- **Then the dry run** with California (`dante@bltz.me` as school staff, plus a separate account for any athlete-side steps).
