# Cursor Prompt — Render awards in dashboard

In the dashboard page where a player's data is shown:
- Import and render `components/AwardCard`.
- Fetch from `/api/awards/scrape` on button click (playerId, playerName, teamOrSchool provided by page props or store).
- After success, show the list of cards from the returned JSON `awards`.
- Add another button "Save to BLTZ" that POSTs the same array to `/api/awards/save`, shows a toast on success.
- Ensure responsive layout with a 2‑column grid on md+ and 1‑column on mobile.
