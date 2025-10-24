# Cursor Prompt — Convert pages API to App Router

Refactor the file at `pages/api/awards/scrape.ts` to the App Router.
- New path: `app/api/awards/scrape/route.ts`
- Use `NextRequest`/`NextResponse`.
- Keep identical logic and imports (adjust type imports for App Router).
- Ensure it handles POST only and returns the same JSON shape.
