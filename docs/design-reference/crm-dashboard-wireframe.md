# CRM dashboard shell wireframe

## Page intent

Primary user: organization owner, organization administrator, media manager, rights manager, analyst, or viewer.

Primary action: enter the correct organization workspace and understand what operational area is available.

Secondary actions: switch organizations, filter the workspace by team or season, open the personal dashboard, or sign out.

Critical information: current organization, access role, organization status, current team and season filters, and the active CRM section.

Mobile priority: preserve organization switching, current-section context, and access to the full navigation in a keyboard-accessible drawer. Dense operational tables are not part of this increment.

Known exclusions: roster management, media library, rights records, approvals, campaigns, analytics, revenue, member management, notification behavior, global search, and organization mutation.

## Desktop

```text
+--------------------------+--------------------------------------------------+
| BLTZ / MEDIA OPERATIONS  | [menu] Organization name       [team] [season] |
|                          +--------------------------------------------------+
| [ Organization switcher] |                                                  |
|                          |  OVERVIEW                                        |
| Overview                 |  Organization workspace                          |
| Athletes        locked   |  Operational setup and recent work will appear  |
| Media           locked   |  here as each approved module is enabled.       |
| Rights          locked   |                                                  |
| Approvals       locked   |  +--------------------------------------------+  |
| Campaigns       locked   |  | Workspace ready                            |  |
| Analytics       locked   |  | Organization, access, and career context   |  |
| Revenue         locked   |  | are connected. No operational records yet. |  |
| Settings        locked   |  +--------------------------------------------+  |
|                          |                                                  |
| role / access scope      |                                                  |
| [account] [sign out]     |                                                  |
+--------------------------+--------------------------------------------------+
```

The navigation is stable, but only implemented destinations are interactive. Future modules are visibly unavailable instead of linking to missing pages.

## Tablet

The left rail collapses to an icon rail. The organization switcher remains in the header. Team and season filters remain on one horizontal row when space permits and wrap below the title when required.

## Mobile

```text
+------------------------------------------------+
| [menu] Organization name             [switch] |
+------------------------------------------------+
| Team filter                                   |
| Season filter                                 |
+------------------------------------------------+
| Overview                                      |
| Organization workspace                        |
|                                               |
| Workspace ready                               |
| Organization and access foundations are      |
| connected.                                    |
+------------------------------------------------+
```

The menu opens as a modal drawer, traps focus, closes with Escape, and labels unavailable destinations. Controls remain at least 44 pixels high.

## Loading state

Reserve the final shell geometry with a fixed-width desktop rail, header bar, two filter placeholders, title lines, and one content panel. Do not use a centered spinner.

## Empty state

Explain that the workspace is authorized and connected without inventing metrics or records. Do not show mutation actions until their server workflows exist.

## Error state

Show a concise workspace error with Retry and Return to organization selection. Authorization failures remain not-found responses so tenant existence is not disclosed.

