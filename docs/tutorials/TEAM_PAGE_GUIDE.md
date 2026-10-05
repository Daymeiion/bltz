# Team Page Guide

## Overview

The Team page allows players to connect with teammates they've played with and invite other players to join bltz. This feature helps build a community of connected athletes within the platform.

## Features

### 1. View Teammates
- See all players you've marked as teammates
- View teammate profiles, positions, and teams
- Track games played together
- See when you last played together
- Quick link to teammate profiles

### 2. Add Teammates
- Search for players already on bltz
- Add them as teammates with one click
- Track your relationship history

### 3. Invite Players to bltz
- Send invitations via email to players not yet on bltz
- Include a personal message with the invite
- Generate shareable invite links
- Track pending, accepted, and declined invites

## Database Schema

### `player_teammates` Table
Stores relationships between players who have played together:
- `player_id` - The player who owns this relationship
- `teammate_player_id` - The teammate player
- `games_played_together` - Number of games played together
- `last_played_together` - Date of last game together
- Automatic reciprocal relationships (bidirectional)

### `team_invites` Table
Tracks invitations to join bltz:
- `inviter_user_id` - User sending the invite
- `inviter_player_id` - Player profile of inviter (if applicable)
- `invitee_email` - Email address of person being invited
- `invitee_name` - Name of person being invited (optional)
- `status` - pending, accepted, declined, or expired
- `invite_code` - Unique code for tracking
- `message` - Personal message from inviter
- `expires_at` - Expiration date (default 30 days)

## API Routes

### GET `/api/team/teammates`
Fetch all teammates for the current user.

**Response:**
```json
{
  "teammates": [
    {
      "id": "uuid",
      "player_id": "uuid",
      "teammate_player_id": "uuid",
      "games_played_together": 5,
      "last_played_together": "2025-10-01T00:00:00Z",
      "teammate": {
        "id": "uuid",
        "name": "John Doe",
        "full_name": "John Michael Doe",
        "profile_image": "url",
        "position": "Forward",
        "team": "Team Name",
        "slug": "john-doe"
      }
    }
  ]
}
```

### POST `/api/team/teammates`
Add a new teammate.

**Request:**
```json
{
  "teammate_player_id": "uuid",
  "games_played_together": 5,
  "last_played_together": "2025-10-01T00:00:00Z"
}
```

### DELETE `/api/team/teammates?id={teammate_id}`
Remove a teammate relationship.

### GET `/api/team/invites?type=sent|received`
Fetch invites (sent or received).

### POST `/api/team/invites`
Send a new invite.

**Request:**
```json
{
  "invitee_email": "teammate@example.com",
  "invitee_name": "John Doe",
  "message": "Join me on bltz!"
}
```

### PATCH `/api/team/invites`
Update invite status (accept/decline).

**Request:**
```json
{
  "invite_id": "uuid",
  "status": "accepted" | "declined"
}
```

### GET `/api/team/search?q={query}`
Search for players by name.

## Components

### `InviteModal`
Modal for sending invitations to join bltz:
- Email input with validation
- Optional name and personal message fields
- Generates shareable invite link
- Copy-to-clipboard functionality
- Success state with invite link display

**Props:**
- `open: boolean` - Modal visibility
- `onOpenChange: (open: boolean) => void` - Close handler
- `onInviteSent?: () => void` - Callback after successful invite

### `AddTeammateModal`
Modal for searching and adding existing bltz players as teammates:
- Real-time search with debouncing
- Player cards with avatar, name, position, and team
- One-click add functionality
- Loading and empty states

**Props:**
- `open: boolean` - Modal visibility
- `onOpenChange: (open: boolean) => void` - Close handler
- `onTeammateAdded?: () => void` - Callback after adding teammate

### `TeamPageClient`
Main team page component with two tabs:
1. **Teammates Tab** - Grid of teammate cards
2. **Invites Tab** - List of sent invites with status

Features:
- Stats cards showing total teammates, pending invites, and games together
- Action buttons to add teammates and send invites
- Teammate cards with profile info and actions
- Invite tracking with status badges

## Usage

### Accessing the Team Page
Navigate to `/dashboard/team` or click "Team" in the dashboard sidebar.

### Adding a Teammate
1. Click "Add Teammate" button
2. Search for the player by name
3. Click "Add" on the desired player card
4. The reciprocal relationship is automatically created

### Inviting Someone to bltz
1. Click "Invite to bltz" button
2. Enter their email address
3. Optionally add their name and a personal message
4. Click "Send Invite"
5. Copy the generated link to share directly

### Managing Teammates
- Click the three-dot menu on any teammate card to remove them
- View teammate profiles by clicking "View Profile"

## Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only view their own teammates
- Users can only view invites they sent or received
- Email validation prevents invalid addresses
- Checks prevent inviting users already on bltz
- Only players can add teammates

## Future Enhancements

- [ ] Email notifications when invites are sent
- [ ] Email notifications when invites are accepted
- [ ] Team statistics and insights
- [ ] Import teammates from external sources (e.g., team rosters)
- [ ] Teammate recommendations based on common connections
- [ ] Message/chat functionality with teammates
- [ ] Collaborative video sharing with teammates
- [ ] Team highlights and shared content

## Navigation

The Team page is accessible from the dashboard sidebar:
- Icon: Users icon (IconUsers)
- Label: "Team"
- Route: `/dashboard/team`
- Requires: Player role authentication

