# BLTZ Messaging System Setup Guide

## Overview
The BLTZ messaging system allows users to communicate with each other and with administrators. This includes:
- **Admin-to-User messaging**: Admins can send messages to any user
- **User-to-Admin messaging**: Users can contact administrators
- **User-to-User messaging**: Players, publishers, and fans can message each other

## Database Setup

### 1. Run the SQL Scripts
Execute the following SQL scripts in your Supabase SQL editor:

```sql
-- 1. Copy and paste the contents of scripts/setup-messaging.sql
-- 2. Copy and paste the contents of scripts/setup-storage.sql
```

### 2. Verify Tables Created
After running the script, you should see these tables:
- `messages` - Main messages table
- `message_attachments` - File attachments with image support
- `message_threads` - Message threading
- `message_recipients` - Group messaging
- `message_templates` - Admin message templates

### 3. Verify Storage Bucket
After running the storage script, you should see:
- `message-images` storage bucket created
- RLS policies for secure image access
- File size limits (5MB max)

### 4. Check RLS Policies
The script creates Row Level Security (RLS) policies that allow:
- Users to view their own messages
- Users to send messages to other users
- Admins to manage all messages
- Secure image access based on message ownership

## API Endpoints

### Admin Endpoints
- `GET /api/admin/messages` - Fetch all messages (admin only)
- `POST /api/admin/messages` - Send message as admin
- `GET /api/admin/users` - Get all users for recipient selection

### User Endpoints
- `GET /api/messages` - Fetch user's messages
- `POST /api/messages` - Send message (to admin or other users)
- `PUT /api/messages/[id]/read` - Mark message as read
- `GET /api/users` - Get available users for messaging
- `POST /api/messages/upload` - Upload images for messages

## Features

### Message Types
1. **admin_to_user** - Admin sends to user
2. **user_to_admin** - User sends to admin
3. **user_to_user** - User sends to another user

### Message Status
- `sent` - Message sent
- `delivered` - Message delivered
- `read` - Message read by recipient
- `archived` - Message archived

### Priority Levels
- `low` - Low priority
- `normal` - Normal priority
- `high` - High priority
- `urgent` - Urgent priority

### Image Messaging
- **File Size Limits**: 5MB max per image, compressed to 1MB
- **Supported Formats**: JPEG, PNG, WebP, GIF
- **Auto Compression**: Images automatically resized and compressed
- **Thumbnail Generation**: Automatic thumbnail creation for faster loading
- **Image Gallery**: Click to view full-size images with navigation
- **Download Support**: Users can download original images

## UI Components

### Admin Message Center
- **Location**: `/admin/messages`
- **Features**:
  - View all messages
  - Send messages to any user
  - Filter by status and search
  - Real-time updates

### Player Message Center
- **Location**: `/dashboard/messages`
- **Features**:
  - View personal messages
  - Send messages to other users or admin
  - Recipient selection dropdown
  - Unread message indicators

## Testing the System

### 1. Test Admin Messaging
1. Login as admin
2. Go to `/admin/messages`
3. Click "New Message"
4. Select a user and send a message

### 2. Test User Messaging
1. Login as a player/publisher/fan
2. Go to `/dashboard/messages`
3. Click the "+" button to compose
4. Select a recipient and send a message

### 3. Test User-to-User Messaging
1. Login as a player
2. Go to messages
3. In the compose modal, select another player/publisher/fan
4. Send a message

## Security Features

### Row Level Security (RLS)
- Users can only see their own messages
- Users can only send messages to valid recipients
- Admins have full access to all messages

### Message Validation
- Recipient must exist and be a valid user
- Message type is automatically determined based on recipient role
- All messages are logged with timestamps

## Troubleshooting

### Common Issues

1. **"Could not find table 'messages'"**
   - Run the SQL script in Supabase
   - Check that the script executed successfully

2. **"Unauthorized" errors**
   - Ensure user is logged in
   - Check that RLS policies are active

3. **Messages not appearing**
   - Check that the user has the correct role
   - Verify RLS policies are working
   - Check browser console for errors

4. **"Cannot read properties of null (reading 'value')" Error** ⚡ **FIXED**
   - **Cause**: Input element not found by querySelector
   - **Solution**: Updated to use FormData with name attributes
   - **Status**: Resolved in latest update

5. **Send Button Not Working** ⚡ **FIXED**
   - **Cause**: Missing `type="submit"` on send button
   - **Solution**: Added proper form submission handling
   - **Status**: Resolved in latest update

6. **Messages Not Clearing After Send** ⚡ **FIXED**
   - **Cause**: Input value not being reset properly
   - **Solution**: Using `form.reset()` for reliable form clearing
   - **Status**: Resolved in latest update

### Debug Steps
1. Check Supabase logs for database errors
2. Verify API endpoints are working
3. Check browser network tab for failed requests
4. Ensure all environment variables are set
5. Verify form inputs have `name` attributes
6. Check that send buttons have `type="submit"`

## Recent Updates & Fixes ⚡

### Message Input Improvements (Latest Update)
- **Fixed Send Button Issues**: Send buttons now properly submit forms with `type="submit"`
- **Improved Form Handling**: Replaced unreliable `querySelector` with `FormData` for better reliability
- **Enhanced Error Prevention**: Added proper null checking and optional chaining
- **Better Form Reset**: Messages now clear properly after sending using `form.reset()`

### Technical Changes
- **FormData Integration**: All message forms now use `name` attributes for reliable data extraction
- **Consistent Behavior**: Both admin and player message centers work identically
- **Error Prevention**: Added safeguards against runtime errors
- **Better UX**: Improved user experience with reliable form submission

### Files Updated
- `components/admin/MessageCenter.tsx` - Fixed admin message input handling
- `components/player/MessageCenter.tsx` - Fixed player message input handling

## Sample Data
The system includes sample data that displays when:
- Database tables don't exist yet
- API calls fail
- No real messages are found

Look for "Sample Data" badges in the UI to identify when fallback data is being used.

## Next Steps
1. Run the SQL script in Supabase
2. Test the messaging system
3. Customize message templates
4. Add file attachment support
5. Implement push notifications
