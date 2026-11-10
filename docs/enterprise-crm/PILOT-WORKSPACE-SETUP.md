# Pilot school workspace — setup

Decision (2026-11-02): pilot uses **organization-wide** permissions only (simplified Proposal 0004). Team-scoped access is deferred.

## 1. Run the migrations, in order

In the Supabase SQL Editor:

1. `supabase/migrations/20261102120000_crm_pilot_school_permissions.sql` — permissions and the school-to-college link.
2. `supabase/migrations/20261102130000_crm_pilot_activations.sql` — activations, tracked-link visits, social reach.
3. `supabase/migrations/20261102140000_crm_pilot_locker_launches.sql` — Locker launches and school-connected media.
4. `supabase/migrations/20261102150000_crm_pilot_activation_athletes.sql` — more than one former player featured in an activation.
5. `supabase/migrations/20261102160000_crm_pilot_media_uploads.sql` — private upload bucket for school video and photos, Getty media, and media on activations.
6. `supabase/migrations/20261109120000_crm_pilot_moment_media.sql` — ties school media to a career Moment.
7. `supabase/migrations/20261109130000_crm_pilot_integrations.sql` — Settings connections (Slack, Teams, WordPress). Server-only; links and passwords never reach the browser.
8. `supabase/migrations/20261109140000_crm_pilot_school_signals.sql` — signals schools add themselves (AI-drafted or by hand), tracked in admin under School Launches. AI drafting needs `ANTHROPIC_API_KEY` in Vercel; web sources use the existing `TAVILY_API_KEY`.
9. `supabase/migrations/20261110120000_crm_pilot_dismissals.sql` — signals and Moments a school hides from its own workspace (the shared engine is unchanged).
10. `supabase/migrations/20261110130000_crm_pilot_briefs.sql` — partnership briefs shared with brands by private link (token hash only, expiry, open counts). The `/brief/<token>` page is public by design.
11. `supabase/migrations/20261110140000_crm_pilot_onboarding.sql` — pilot applications (`/pilot`), each organization's roster from the master player list, and tracked Locker invites (`/join/<token>`). Also makes accounts created from the pilot form start as non-athletes.

## Onboarding without SQL

After migration 11, a school or agency applies at `/pilot`. Approve it in **Admin → School Launches → Pilot applications**: pick the school's college name as the master list spells it (suggestions show player counts), then Approve. That makes the applicant the owner, grants the pilot permissions, links the college's colors and logo, and lists every matching master-list player on their roster. The applicant must confirm their email before you can approve. Steps 2 and 3 below are only needed for manual changes.

Staff invite players from **Launch a Locker → Your players**: an email from BLTZ on the school's behalf (uses the `BLTZ_PREVIEW_EMAIL_*` mailbox settings; 100 emailed invites per school per day) or a personal link they send themselves.

All five are additive and empty: nobody gains access until step 3 below.

## 2. Brand the school (optional)

Find the school's directory row, then link it. Unlinked schools use BLTZ colors.

```sql
select id, canonical_name, primary_color_hex, secondary_color_hex, logo_url
  from public."Colleges" where canonical_name ilike '%<school name>%';

update public.schools set college_directory_id = <Colleges.id>
 where id = '<schools.id used by the organization>';
```

Colors must pass contrast checks (primary on white, secondary on dark text) or the workspace falls back to BLTZ colors.

## 3. Grant a staff member access

Each grant is logged in `audit_logs` and takes effect within a minute.

```sql
-- Pilot set: Overview, Intelligence, activity, planning and launching.
select public.grant_enterprise_permission(
  '<organization_memberships.id>', key, '<your auth user id>', 'Pilot onboarding'
)
from unnest(array[
  'executive.overview.read', 'intelligence.read',
  'activation.read', 'activation.manage'
]) as key;
```

For view-only staff, leave out `activation.manage`. Revoke with `public.revoke_enterprise_permission(membership_id, key, actor_id, reason)`. History is never deleted.

| Page | Needs |
|---|---|
| Overview | `executive.overview.read` (activity section also needs `activation.read`) |
| Intelligence + athlete pages | `intelligence.read` (activations and reach also need `activation.read`) |
| Plan activations, record reach, connect media, Launch a Locker | `activation.manage` |

## 4. Work the launch queue

School launches and school-added media land in **Admin → School Launches** (`/admin/locker-launches`):

1. Build the Locker with the batch builder in Preview Lockers (paste the player's name and college).
2. Set the launch to **Building**, then **Invite sent** once the claim invite goes out, then **Live**.
3. Approve or reject each media item. Only approved items count as "On Locker".

## Behavior

- Pages: **Overview**, **Intelligence** (directory + one page per athlete) and **Launch a Locker**. See `PILOT-SCOPE.md`.
- Members see only the pages they've been granted. A member with no grants sees "Your access is being set up".
- BLTZ internal admins see every non-financial page in every workspace.
- Tracked links (`/api/go/<activation id>`) count each fan visit, then open the player's public Locker.
- Uploads (video up to 250 MB, photos up to 15 MB) go to the private `organization-athlete-media` bucket through one-time signed links; nothing there is public.
- Getty Images search for schools uses the same server-side `GETTY_API_KEY` as the admin Lab. Without it, staff paste gettyimages.com links instead.
