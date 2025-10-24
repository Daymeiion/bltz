# Cursor Prompt — Expand the trusted domain allowlist

Open `lib/search/tavily.ts` and add these domains to `include_domains`:
- si.com, theathletic.com, cbssports.com, foxsports.com, nbcsports.com, bleacherreport.com
- pac-12.com (or historical archive), bigten.org, secsports.com
- official team domains for NFL (list array of *.nfl.com/team names) and college (common *.edu athletics subdomains)

Keep results under 10 per query.
