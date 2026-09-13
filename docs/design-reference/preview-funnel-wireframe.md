# Preview conversion workspace
Primary user: BLTZ administrator managing 100+ private previews.
Primary action: find the next athlete follow-up and inspect their evidence.
Secondary actions: filter cohort, enroll preview, confirm booking/walkthrough, prepare referrals.
Critical information: sent denominator, unique previews versus repeat events, response, latest activity.
Mobile priority: two-column conversion summary, stacked athlete rows, full-width detail panel.
Known exclusions: no claim verification, outreach automation, new metrics or backend entities.

Layout decision for this authorized redesign:
```
Preview conversion                       GTM navigation
90-day experiment                  [Cohort filters] [Enroll]
Enrolled / Sent / Responses / Viewing sessions
VIEWED           CLAIM INTEREST      BOOKED         WALKTHROUGH
count / sent     count / sent        count / sent   count / sent
horizontal bars with independent common sent denominator
[All conversion measures: expandable compact table]

[Previews] [Referral preparation]
[All] [Awaiting response] [Dashboard requests] [Booked calls] [Declines]
Search athlete/campaign                     Sort latest activity
Athlete | Response | Campaign | Latest activity | Open timeline
15 rows per page                        Previous / Next
```
Selecting one row opens the existing accessible Sheet with athlete response,
relevant actions and a paginated vertical event timeline. Referral details use
the same panel. No funnel widths imply sequential attrition: measures may occur
independently and every percentage explicitly uses the sent cohort.
