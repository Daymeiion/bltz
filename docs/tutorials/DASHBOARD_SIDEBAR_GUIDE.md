# Dashboard Sidebar Navigation Guide

## Overview

The dashboard now features a **persistent sidebar** that appears on all dashboard sub-pages, providing seamless navigation throughout the player dashboard area.

## Architecture

### Layout Structure

```
app/dashboard/
├── layout.tsx              (Server Component - Auth & RBAC)
├── dashboard-layout-client.tsx  (Client Component - Sidebar UI)
├── page.tsx                (Dashboard Home - Server Component)
├── dashboard-client.tsx    (Dashboard Home - Client Component)
├── videos/
│   └── page.tsx           (Videos Page - Client Component)
├── stats/
│   └── page.tsx           (Stats Page - Server Component)
└── [other sub-pages]/
```

### How It Works

1. **`layout.tsx`** (Server Component)
   - Handles authentication check
   - Verifies player role (RBAC)
   - Fetches player ID and slug
   - Wraps all dashboard pages

2. **`dashboard-layout-client.tsx`** (Client Component)
   - Renders the Aceternity Sidebar
   - Contains navigation links
   - Persists across all dashboard routes
   - Responsive (collapses on mobile)

3. **Sub-pages** (Server or Client Components)
   - Focus only on their specific content
   - No need to include sidebar code
   - Automatically wrapped by the layout

## Sidebar Navigation Links

| Label | Route | Icon | Description |
|-------|-------|------|-------------|
| Dashboard | `/dashboard` | IconBrandTabler | Main dashboard home |
| My Locker | `/player/[slug]` | IconUserBolt | Player's public locker page |
| My Videos | `/dashboard/videos` | IconVideo | Video management (3-col grid) |
| Statistics | `/dashboard/stats` | IconChartBar | Rankings & leaderboard |
| Schedule | `/dashboard/schedule` | IconCalendar | Coming soon |
| Achievements | `/dashboard/achievements` | IconTrophy | Coming soon |
| Team | `/dashboard/team` | IconUsers | Coming soon |
| Settings | `/dashboard/settings` | IconSettings | Coming soon |
| Back to Home | `/` | IconHome | Return to main site |

## User Profile Display

- Located at the bottom of the sidebar
- Shows user's avatar (or default)
- Displays user's display name or email
- Links to settings page

## Benefits

✅ **Consistent Navigation** - Same navigation on every dashboard page
✅ **Easy to Extend** - Add new pages without duplicating sidebar code
✅ **RBAC Protected** - All pages automatically inherit authentication
✅ **Responsive** - Sidebar collapses on mobile, expands on hover
✅ **Clean Code** - Sub-pages focus only on their content

## Adding New Dashboard Pages

To add a new dashboard sub-page:

1. Create the page file:
   ```typescript
   // app/dashboard/new-page/page.tsx
   export default function NewPage() {
     return (
       <div className="min-h-screen bg-white dark:bg-neutral-900 p-4 md:p-8">
         <div className="max-w-7xl mx-auto">
           {/* Your content here */}
         </div>
       </div>
     );
   }
   ```

2. Add the link to `dashboard-layout-client.tsx`:
   ```typescript
   {
     label: "New Page",
     href: "/dashboard/new-page",
     icon: <IconName className="..." />,
   }
   ```

3. Done! The sidebar will automatically appear on your new page.

## Styling Consistency

All dashboard pages should use this container structure:

```tsx
<div className="min-h-screen bg-white dark:bg-neutral-900 p-4 md:p-8">
  <div className="max-w-7xl mx-auto">
    {/* Page content */}
  </div>
</div>
```

This ensures:
- Consistent padding and spacing
- Proper dark mode support
- Responsive layout
- Full-height pages

## Mobile Experience

- **Desktop**: Sidebar visible by default, can collapse
- **Tablet**: Sidebar collapsed by default, expands on hover
- **Mobile**: Sidebar hidden, accessible via hamburger menu

## Future Enhancements

- [ ] Settings page with user preferences
- [ ] Schedule/Calendar integration
- [ ] Achievements showcase
- [ ] Team management
- [ ] Notification center
- [ ] Profile editing inline
- [ ] Dark mode toggle in sidebar

## Testing

To test the sidebar navigation:

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3001/dashboard`
3. Click through different sidebar links
4. Verify the sidebar persists across all pages
5. Test responsive behavior by resizing the browser

## Notes

- The sidebar state (open/closed) is managed client-side
- Authentication is checked server-side in the layout
- Player ID is fetched once in the layout and passed down
- All sub-pages inherit the layout's RBAC protection

